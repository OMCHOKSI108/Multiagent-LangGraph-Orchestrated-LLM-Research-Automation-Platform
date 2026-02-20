const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');
const auth = require('../middleware/auth');

// In-memory SSE token store: token -> { userId, username, researchId, expiresAt }
if (!global.SSE_TOKENS) {
    global.SSE_TOKENS = new Map();
}

// Generate a short-lived SSE token for EventSource clients.
// GET /events/token/:research_id
router.get('/token/:research_id', auth, async (req, res) => {
    try {
        const { research_id } = req.params;
        const userId = req.user.id;

        // Verify ownership of research
        const research = await db.query('SELECT id FROM research_logs WHERE id = $1 AND user_id = $2', [research_id, userId]);
        if (research.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found or not owned by user' });
        }

        const raw = require('crypto').randomBytes(18).toString('hex');
        const token = raw;
        const expiresAt = Date.now() + (60 * 1000); // 60 seconds

        global.SSE_TOKENS.set(token, { userId, username: req.user.username, researchId: research_id, expiresAt });

        // Schedule cleanup (best-effort)
        setTimeout(() => { try { global.SSE_TOKENS.delete(token); } catch (e) { } }, 65 * 1000);

        res.json({ token, expires_in: 60 });
    } catch (err) {
        logger.error(`[SSE Token] ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Server-Sent Events (SSE) endpoint for real-time execution updates.
 * 
 * GET /events/stream/:research_id
 * 
 * Returns a continuous stream of execution events for the given research.
 */
router.get('/stream/:research_id', auth, async (req, res) => {
    const { research_id } = req.params;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    logger.info(`[SSE] Client connected for research #${research_id}`);

    let lastEventId = 0;
    let lastSourceId = 0;
    let isCompleted = false;

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', research_id })}\n\n`);

    // Polling function to check for new events
    const pollEvents = async () => {
        if (isCompleted) return;

        try {
            // Get new events since last fetch
            const eventsResult = await db.query(
                `SELECT id, event_id, stage, severity, category, message, details, created_at
                 FROM execution_events 
                 WHERE research_id = $1 AND id > $2
                 ORDER BY created_at ASC`,
                [research_id, lastEventId]
            );

            for (const event of eventsResult.rows) {
                const eventData = {
                    type: 'event',
                    event_id: event.event_id,
                    stage: event.stage,
                    severity: event.severity,
                    category: event.category,
                    message: event.message,
                    details: event.details,
                    timestamp: event.created_at
                };
                res.write(`data: ${JSON.stringify(eventData)}\n\n`);
                lastEventId = event.id;
            }

            // Stream newly discovered data sources
            const sourcesResult = await db.query(
                `SELECT id, source_type, domain, url, status, items_found, title, description, favicon, thumbnail, published_date, citation_text
                 FROM data_sources
                 WHERE research_id = $1 AND id > $2
                 ORDER BY id ASC`,
                [research_id, lastSourceId]
            );

            if (sourcesResult.rows.length > 0) {
                const sourcesPayload = sourcesResult.rows.map((row) => ({
                    source_type: row.source_type,
                    domain: row.domain,
                    url: row.url,
                    status: row.status,
                    items_found: row.items_found,
                    title: row.title,
                    description: row.description,
                    favicon: row.favicon,
                    thumbnail: row.thumbnail,
                    published_date: row.published_date,
                    citation_text: row.citation_text
                }));
                res.write(`data: ${JSON.stringify({ type: 'sources', sources: sourcesPayload })}\n\n`);
                lastSourceId = sourcesResult.rows[sourcesResult.rows.length - 1].id;
            }

            // Get current research status
            const statusResult = await db.query(
                `SELECT status, current_stage, started_at, completed_at, title
                 FROM research_logs WHERE id = $1`,
                [research_id]
            );

            if (statusResult.rows.length > 0) {
                const status = statusResult.rows[0];
                res.write(`data: ${JSON.stringify({
                    type: 'status',
                    status: status.status,
                    current_stage: status.current_stage,
                    started_at: status.started_at,
                    completed_at: status.completed_at,
                    title: status.title
                })}\n\n`);

                if (status.status === 'completed' || status.status === 'failed') {
                    // send final status and done event, then finish the stream
                    res.write(`data: ${JSON.stringify({ type: 'status', status: status.status, current_stage: status.current_stage, completed_at: status.completed_at })}\n\n`);
                    res.write(`data: ${JSON.stringify({ type: 'done', status: status.status })}\n\n`);
                    isCompleted = true;
                    // end the response after a short delay to ensure client receives the final events
                    setTimeout(() => {
                        try { res.end(); } catch (e) { }
                    }, 500);
                    return;
                }
            }
        } catch (err) {
            logger.error(`[SSE Poll] ${err.message}`);
        }
    };

    // Start polling and keep it running until client disconnects or research completes
    const pollInterval = setInterval(pollEvents, 2000);
    pollEvents();

    req.on('close', () => {
        isCompleted = true;
        clearInterval(pollInterval);
        logger.info(`[SSE] Client disconnected for research #${research_id}`);
    });
});

/**
 * Insert a new execution event.
 * Called by Python AI Engine or Worker.
 * 
 * POST /events
 */
router.post('/', async (req, res) => {
    try {
        const { research_id, event_id, stage, severity, category, message, details } = req.body;

        if (!research_id || !message) {
            return res.status(400).json({ error: 'research_id and message required' });
        }

        const eventId = event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            await db.query(
                `INSERT INTO execution_events (research_id, event_id, stage, severity, category, message, details)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (event_id) DO NOTHING`,
                [research_id, eventId, stage || 'unknown', severity || 'info', category || 'stage', message, details || {}]
            );

            // Update current_stage on research_logs
            if (stage) {
                await db.query(
                    `UPDATE research_logs SET current_stage = $1, updated_at = NOW() WHERE id = $2`,
                    [stage, research_id]
                );
            }
        } catch (dbErr) {
            // Handle Foreign Key Violation (Research ID not found)
            if (dbErr.code === '23503') {
                logger.warn(`[Events] Skipped event for non-existent research_id: ${research_id}`);
                return res.json({ success: false, ignored: true });
            }
            throw dbErr; // Re-throw other errors
        }

        res.json({ success: true, event_id: eventId });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Insert a data source.
 * 
 * POST /events/source
 */
router.post('/source', async (req, res) => {
    try {
        const {
            research_id, source_type, domain, url, status, items_found,
            title, description, favicon, thumbnail, published_date, citation_text
        } = req.body;

        // Use enriched insert if new columns exist, fall back gracefully
        try {
            await db.query(
                `INSERT INTO data_sources (research_id, source_type, domain, url, status, items_found,
                 title, description, favicon, thumbnail, published_date, citation_text)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [research_id, source_type, domain, url, status || 'success', items_found || 0,
                    title || null, description || null, favicon || null, thumbnail || null,
                    published_date || null, citation_text || null]
            );
        } catch (colErr) {
            // Fallback if migration hasn't been run yet
            await db.query(
                `INSERT INTO data_sources (research_id, source_type, domain, url, status, items_found)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [research_id, source_type, domain, url, status || 'success', items_found || 0]
            );
        }

        res.json({ success: true });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Rename a research.
 * 
 * PATCH /events/research/:id/rename
 */
router.patch('/research/:id/rename', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title required' });
        }

        await db.query(
            `UPDATE research_logs SET title = $1, updated_at = NOW() WHERE id = $2`,
            [title, id]
        );

        res.json({ success: true, title });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Get execution event history for a research.
 * 
 * GET /events/:research_id
 */
router.get('/:research_id', auth, async (req, res) => {
    try {
        const { research_id } = req.params;
        const userId = req.user.id;

        // Verify ownership/access
        const research = await db.query('SELECT id FROM research_logs WHERE id = $1 AND user_id = $2', [research_id, userId]);
        if (research.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const events = await db.query(
            `SELECT id, event_id, stage, severity, category, message, details, created_at 
             FROM execution_events 
             WHERE research_id = $1 
             ORDER BY created_at ASC`,
            [research_id]
        );

        const history = events.rows.map(row => ({
            type: 'event', // Mark as standard event
            event_id: row.event_id,
            timestamp: row.created_at,
            stage: row.stage,
            severity: row.severity,
            category: row.category,
            message: row.message,
            details: row.details
        }));

        res.json(history);
    } catch (err) {
        logger.error(`[Events History] ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Get data sources for a research (historical hydration).
 *
 * GET /events/:research_id/sources
 */
router.get('/:research_id/sources', auth, async (req, res) => {
    try {
        const { research_id } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const research = await db.query('SELECT id FROM research_logs WHERE id = $1 AND user_id = $2', [research_id, userId]);
        if (research.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const sources = await db.query(
            `SELECT source_type, domain, url, status, items_found, title, description, favicon, thumbnail, published_date, citation_text
             FROM data_sources
             WHERE research_id = $1
             ORDER BY id ASC`,
            [research_id]
        );

        res.json(sources.rows);
    } catch (err) {
        logger.error(`[Sources History] ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
