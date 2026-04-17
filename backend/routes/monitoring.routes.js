const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Import monitoring services
const MetricsCollector = require('../services/monitoring/metrics_collector');
const ApiKeyManager = require('../services/api_key_manager');

// Initialize services (will be injected by main app)
let metricsCollector;
let apiKeyManager;
let db;

function initializeMonitoringServices(databaseConnection, collector, keyManager) {
    db = databaseConnection;
    metricsCollector = collector;
    apiKeyManager = keyManager;
}

function requireInternalEngineKey(req, res, next) {
    const expected = process.env.AI_ENGINE_SECRET || '';
    const provided = req.header('X-API-Key') || '';
    if (!expected || provided !== expected) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
}

/**
 * GET /api/admin/metrics/system
 * Get system metrics (CPU, RAM, Disk, Uptime)
 */
router.get('/metrics/system', async (req, res) => {
    try {
        const metrics = await metricsCollector.getSystemMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching system metrics:', error);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
});

/**
 * GET /api/admin/metrics/api-usage
 * Get API usage metrics for all providers
 */
router.get('/metrics/api-usage', async (req, res) => {
    try {
        const metrics = await metricsCollector.getApiUsageMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching API usage metrics:', error);
        res.status(500).json({ error: 'Failed to fetch API usage metrics' });
    }
});

/**
 * GET /api/admin/metrics/database
 * Get database metrics (size, connections, performance)
 */
router.get('/metrics/database', async (req, res) => {
    try {
        const metrics = await metricsCollector.getDatabaseMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching database metrics:', error);
        res.status(500).json({ error: 'Failed to fetch database metrics' });
    }
});

/**
 * GET /api/admin/metrics/services
 * Get Docker/services health and resource usage
 */
router.get('/metrics/services', async (req, res) => {
    try {
        const metrics = await metricsCollector.getServiceMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching service metrics:', error);
        res.status(500).json({ error: 'Failed to fetch service metrics' });
    }
});

/**
 * GET /api/admin/metrics/ai-model
 * Get AI model monitoring metrics
 */
router.get('/metrics/ai-model', async (req, res) => {
    try {
        const metrics = await metricsCollector.getAIModelMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching AI model metrics:', error);
        res.status(500).json({ error: 'Failed to fetch AI model metrics' });
    }
});

/**
 * POST /api/admin/metrics/llm/:metricType
 * Receive LLM usage metrics from AI engine
 */
router.post('/metrics/llm/:metricType', requireInternalEngineKey, async (req, res) => {
    try {
        const { metricType } = req.params;
        const metricData = req.body;

        // Store LLM metrics in database
        await db.query(`
            INSERT INTO monitoring_metrics (
                metric_type, metric_name, metric_value, metadata, created_at
            ) VALUES (
                'llm', $1, $2, $3, NOW()
            )
        `, [
            metricType,
            JSON.stringify(metricData),
            JSON.stringify({
                provider: metricData.provider,
                model: metricData.model,
                timestamp: metricData.timestamp
            })
        ]);

        res.json({ success: true });
    } catch (error) {
        console.error('[Admin Metrics] Error storing LLM metrics:', error);
        res.status(500).json({ error: 'Failed to store LLM metrics' });
    }
});

// Apply authentication middleware to all remaining routes
router.use(auth);
router.use(adminAuth);

/**
 * GET /api/admin/metrics/llm
 * Get LLM usage metrics
 */
router.get('/metrics/llm', async (req, res) => {
    try {
        const { hours = 24 } = req.query;

        const result = await db.query(`
            SELECT
                metadata->>'provider' as provider,
                metadata->>'model' as model,
                metric_name as metric_type,
                COUNT(*) as count,
                AVG((metric_value::json)->>'response_time_ms')::float as avg_response_time_ms,
                SUM((metric_value::json)->>'tokens_input')::int as total_tokens_input,
                SUM((metric_value::json)->>'tokens_output')::int as total_tokens_output,
                COUNT(CASE WHEN (metric_value::json)->>'error' IS NOT NULL THEN 1 END) as error_count,
                COUNT(CASE WHEN (metric_value::json)->>'error' ILIKE '%rate limit%' THEN 1 END) as rate_limit_hits
            FROM monitoring_metrics
            WHERE metric_type = 'llm'
            AND created_at >= NOW() - INTERVAL '${hours} hours'
            GROUP BY metadata->>'provider', metadata->>'model', metric_name
            ORDER BY count DESC
        `);

        // Transform results for frontend
        const metrics = {};
        result.rows.forEach(row => {
            const key = `${row.provider}_${row.model}`;
            if (!metrics[key]) {
                metrics[key] = {
                    provider: row.provider,
                    model: row.model,
                    requests: 0,
                    errors: 0,
                    rate_limit_hits: 0,
                    total_tokens_input: 0,
                    total_tokens_output: 0,
                    avg_response_time_ms: 0
                };
            }

            if (row.metric_type === 'request') {
                metrics[key].requests += parseInt(row.count);
                metrics[key].errors += parseInt(row.error_count);
                metrics[key].rate_limit_hits += parseInt(row.rate_limit_hits);
                metrics[key].total_tokens_input += parseInt(row.total_tokens_input || 0);
                metrics[key].total_tokens_output += parseInt(row.total_tokens_output || 0);
                if (row.avg_response_time_ms) {
                    metrics[key].avg_response_time_ms = Math.round(row.avg_response_time_ms);
                }
            }
        });

        res.json({ metrics: Object.values(metrics) });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching LLM metrics:', error);
        res.status(500).json({ error: 'Failed to fetch LLM metrics' });
    }
});

/**
 * GET /api/admin/metrics/all
 * Get all monitoring metrics in one response
 */
router.get('/metrics/all', async (req, res) => {
    try {
        const allMetrics = await metricsCollector.getAllMetrics();
        res.json({ metrics: allMetrics });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching all metrics:', error);
        res.status(500).json({ error: 'Failed to fetch all metrics' });
    }
});

/**
 * GET /api/admin/alerts
 * Get active alerts and summary
 */
router.get('/alerts', async (req, res) => {
    try {
        const alerts = metricsCollector.getAlertsSummary();
        res.json({ alerts });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * POST /api/admin/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
        const { alertId } = req.params;
        const acknowledged = metricsCollector.acknowledgeAlert(alertId);

        if (acknowledged) {
            res.json({ success: true, message: 'Alert acknowledged' });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (error) {
        console.error('[Admin Metrics] Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

/**
 * GET /api/admin/logs
 * Get application logs (streaming or paginated)
 */
router.get('/logs', async (req, res) => {
    try {
        const { lines = 100, service = 'all' } = req.query;

        // For now, return a placeholder. In production, you'd integrate with
        // a logging service like Winston, ELK stack, or cloud logging
        const logs = {
            service,
            lines: parseInt(lines),
            entries: [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    service: 'backend',
                    message: 'Admin monitoring endpoint accessed'
                }
            ],
            note: 'Log streaming integration pending. Check docker-compose logs or application stdout.'
        };

        res.json({ logs });
    } catch (error) {
        console.error('[Admin Metrics] Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

/**
 * GET /api/admin/api-keys
 * Get all API keys (masked for security)
 */
router.get('/api-keys', async (req, res) => {
    try {
        const keys = await apiKeyManager.getAllApiKeys();
        res.json({ keys });
    } catch (error) {
        console.error('[Admin API Keys] Error fetching API keys:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

/**
 * POST /api/admin/api-keys
 * Add a new API key
 */
router.post('/api-keys', async (req, res) => {
    try {
        const { provider, keyName, apiKey, userEmail } = req.body;

        if (!provider || !keyName || !apiKey || !userEmail) {
            return res.status(400).json({
                error: 'Missing required fields: provider, keyName, apiKey, userEmail'
            });
        }

        // Get user ID from email
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult.rows[0].id;
        const newKey = await apiKeyManager.addApiKey(userId, provider, keyName, apiKey);

        res.json({
            success: true,
            message: 'API key added successfully',
            key: newKey
        });
    } catch (error) {
        console.error('[Admin API Keys] Error adding API key:', error);
        res.status(500).json({ error: 'Failed to add API key' });
    }
});

/**
 * PATCH /api/admin/api-keys/:id/activate
 * Activate or deactivate an API key
 */
router.patch('/api-keys/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive must be a boolean' });
        }

        const updated = await apiKeyManager.updateApiKeyStatus(parseInt(id), isActive);

        if (updated) {
            res.json({
                success: true,
                message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`
            });
        } else {
            res.status(404).json({ error: 'API key not found' });
        }
    } catch (error) {
        console.error('[Admin API Keys] Error updating API key status:', error);
        res.status(500).json({ error: 'Failed to update API key status' });
    }
});

/**
 * DELETE /api/admin/api-keys/:id
 * Delete an API key
 */
router.delete('/api-keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await apiKeyManager.deleteApiKey(parseInt(id));

        if (deleted) {
            res.json({ success: true, message: 'API key deleted successfully' });
        } else {
            res.status(404).json({ error: 'API key not found' });
        }
    } catch (error) {
        console.error('[Admin API Keys] Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

/**
 * GET /api/admin/api-keys/stats
 * Get API key usage statistics
 */
router.get('/api-keys/stats', async (req, res) => {
    try {
        const stats = await apiKeyManager.getApiKeyStats();
        res.json({ stats });
    } catch (error) {
        console.error('[Admin API Keys] Error fetching API key stats:', error);
        res.status(500).json({ error: 'Failed to fetch API key statistics' });
    }
});

/**
 * POST /api/admin/api-keys/rotate
 * Rotate API keys for a provider (deactivate old, activate new)
 */
router.post('/api-keys/rotate', async (req, res) => {
    try {
        const { provider, keyName, apiKey, userEmail } = req.body;

        if (!provider || !keyName || !apiKey || !userEmail) {
            return res.status(400).json({
                error: 'Missing required fields: provider, keyName, apiKey, userEmail'
            });
        }

        // Get user ID from email
        const userResult = await db.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userResult.rows[0].id;
        const rotatedKey = await apiKeyManager.rotateApiKey(provider, keyName, apiKey, userId);

        res.json({
            success: true,
            message: `API keys rotated successfully for ${provider}`,
            key: rotatedKey
        });
    } catch (error) {
        console.error('[Admin API Keys] Error rotating API key:', error);
        res.status(500).json({ error: 'Failed to rotate API key' });
    }
});

module.exports = { router, initializeMonitoringServices };