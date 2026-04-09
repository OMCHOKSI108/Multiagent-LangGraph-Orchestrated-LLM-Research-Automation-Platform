const axios = require('axios');

/**
 * API Usage Tracker
 * Tracks external API calls, token usage, errors, and rate limits
 */
class ApiUsageTracker {
    constructor(db) {
        this.db = db;
        this.metrics = new Map();
        this.providers = ['openrouter', 'groq', 'gemini', 'huggingface', 'ollama'];
        this.cacheTimeout = 30000; // 30 seconds cache
        this.cache = new Map();
    }

    /**
     * Track an API call
     * @param {string} provider - The API provider (openrouter, groq, etc.)
     * @param {object} usage - Usage data (tokens, cost, etc.)
     * @param {boolean} success - Whether the call was successful
     * @param {string} error - Error message if failed
     */
    async trackCall(provider, usage = {}, success = true, error = null) {
        if (!this.providers.includes(provider.toLowerCase())) {
            return;
        }

        const key = provider.toLowerCase();
        const now = new Date();

        // Initialize metrics for provider if not exists
        if (!this.metrics.has(key)) {
            this.metrics.set(key, {
                request_count: 0,
                success_count: 0,
                error_count: 0,
                token_usage: 0,
                last_call: null,
                rate_limit_hits: 0,
                errors: []
            });
        }

        const metrics = this.metrics.get(key);
        metrics.request_count++;
        metrics.last_call = now;

        if (success) {
            metrics.success_count++;
        } else {
            metrics.error_count++;
            if (error) {
                metrics.errors.push({
                    timestamp: now,
                    message: error
                });
                // Keep only last 10 errors
                if (metrics.errors.length > 10) {
                    metrics.errors = metrics.errors.slice(-10);
                }
            }
        }

        // Track token usage
        if (usage.tokens) {
            metrics.token_usage += usage.tokens;
        }

        // Check for rate limit errors
        if (error && (error.includes('rate limit') || error.includes('429'))) {
            metrics.rate_limit_hits++;
        }

        // Persist to database (async, don't block)
        this.persistMetrics(key, metrics).catch(err =>
            console.error('[ApiUsageTracker] Failed to persist metrics:', err)
        );
    }

    async persistMetrics(provider, metrics) {
        try {
            // Store in a simple key-value table or use existing structure
            // For now, we'll use a simple approach with a monitoring_metrics table
            const query = `
                INSERT INTO monitoring_metrics (metric_type, provider, data, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (metric_type, provider)
                DO UPDATE SET data = EXCLUDED.data, created_at = NOW()
            `;
            await this.db.query(query, ['api_usage', provider, JSON.stringify(metrics)]);
        } catch (error) {
            // If table doesn't exist yet, we'll create it later in migrations
            console.warn('[ApiUsageTracker] Metrics table not ready, skipping persistence');
        }
    }

    async getApiUsageMetrics() {
        const now = Date.now();
        const cacheKey = 'api_usage_metrics';

        // Return cached data if still fresh
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const result = {};

        // Get from memory (real-time)
        for (const [provider, metrics] of this.metrics.entries()) {
            result[provider] = {
                request_count: metrics.request_count,
                success_count: metrics.success_count,
                error_count: metrics.error_count,
                success_rate: metrics.request_count > 0 ?
                    Math.round((metrics.success_count / metrics.request_count) * 100 * 100) / 100 : 0,
                token_usage: metrics.token_usage,
                rate_limit_hits: metrics.rate_limit_hits,
                last_call: metrics.last_call,
                recent_errors: metrics.errors.slice(-3) // Last 3 errors
            };
        }

        // Try to get persisted data if memory is empty
        if (Object.keys(result).length === 0) {
            try {
                const persisted = await this.db.query(
                    'SELECT provider, data FROM monitoring_metrics WHERE metric_type = $1',
                    ['api_usage']
                );

                persisted.rows.forEach(row => {
                    const data = JSON.parse(row.data);
                    result[row.provider] = {
                        request_count: data.request_count || 0,
                        success_count: data.success_count || 0,
                        error_count: data.error_count || 0,
                        success_rate: data.request_count > 0 ?
                            Math.round((data.success_count / data.request_count) * 100 * 100) / 100 : 0,
                        token_usage: data.token_usage || 0,
                        rate_limit_hits: data.rate_limit_hits || 0,
                        last_call: data.last_call,
                        recent_errors: data.errors ? data.errors.slice(-3) : []
                    };
                });
            } catch (error) {
                // Table might not exist yet
            }
        }

        this.cache.set(cacheKey, { data: result, timestamp: now });
        return result;
    }

    /**
     * Get usage for a specific provider
     */
    getProviderUsage(provider) {
        return this.metrics.get(provider.toLowerCase()) || {
            request_count: 0,
            success_count: 0,
            error_count: 0,
            token_usage: 0,
            rate_limit_hits: 0,
            errors: []
        };
    }
}

module.exports = ApiUsageTracker;