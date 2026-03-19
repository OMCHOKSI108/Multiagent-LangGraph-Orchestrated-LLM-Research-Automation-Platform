/**
 * Sources Routes
 * ==============
 * MARP: Manages scraped research sources per session.
 * 
 * GET  /sources/:session_id         → list all sources for a session
 * POST /sources/scrape              → trigger on-demand URL scrape
 * POST /sources/bulk                → store multiple scraped sources
 * DELETE /sources/:id               → delete a single source
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const axios = require('axios');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
const AI_ENGINE_SECRET = process.env.AI_ENGINE_SECRET || '';

// All routes require auth
router.use(auth);

/**
 * GET /sources/:session_id
 * List all scraped sources for a research session.
 */
router.get('/:session_id', async (req, res) => {
    const { session_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, url, title, content, authors, published_date,
                    source_type, strategy, metadata, word_count, scraped_at
             FROM sources
             WHERE session_id = $1
             ORDER BY scraped_at DESC`,
            [session_id]
        );
        res.json({ sources: result.rows, count: result.rows.length });
    } catch (err) {
        console.error('[sources] GET error:', err.message);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

/**
 * POST /sources/scrape
 * Trigger a single URL scrape via AI Engine.
 * Body: { session_id, url }
 */
router.post('/scrape', async (req, res) => {
    const { session_id, url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    try {
        // Ask AI Engine to scrape
        const aiResponse = await axios.post(
            `${AI_ENGINE_URL}/scrape`,
            { url },
            { headers: { 'X-API-Key': AI_ENGINE_SECRET }, timeout: 60000 }
        );
        const scraped = aiResponse.data;

        // Persist to DB if session_id provided
        if (session_id && scraped.text) {
            await pool.query(
                `INSERT INTO sources (session_id, url, title, content, authors,
                    published_date, source_type, strategy, metadata, word_count, content_hash)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                [
                    session_id,
                    scraped.url || url,
                    scraped.title || '',
                    scraped.text || '',
                    JSON.stringify(scraped.authors || []),
                    scraped.published_date || '',
                    scraped.source_type || 'web',
                    scraped.strategy || 'article',
                    JSON.stringify(scraped.metadata || {}),
                    scraped.word_count || 0,
                    scraped.content_hash || '',
                ]
            );
        }

        res.json({ success: true, source: scraped });
    } catch (err) {
        console.error('[sources] /scrape error:', err.message);
        res.status(500).json({ error: 'Scraping failed', details: err.message });
    }
});

/**
 * POST /sources/bulk
 * Store multiple scraped sources (called internally by AI Engine result handler).
 * Body: { session_id, sources: [{url, title, content, ...}] }
 */
router.post('/bulk', async (req, res) => {
    const { session_id, sources } = req.body;
    if (!session_id || !Array.isArray(sources)) {
        return res.status(400).json({ error: 'session_id and sources[] required' });
    }

    try {
        const inserted = [];
        for (const src of sources) {
            const r = await pool.query(
                `INSERT INTO sources (session_id, url, title, content, authors,
                    published_date, source_type, strategy, metadata, word_count, content_hash)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [
                    session_id,
                    src.url || '',
                    src.title || '',
                    (src.text || src.content || '').substring(0, 50000),
                    JSON.stringify(src.authors || []),
                    src.published_date || '',
                    src.source_type || 'web',
                    src.strategy || 'article',
                    JSON.stringify(src.metadata || {}),
                    src.word_count || 0,
                    src.content_hash || '',
                ]
            );
            if (r.rows[0]) inserted.push(r.rows[0].id);
        }
        res.json({ success: true, inserted_count: inserted.length, ids: inserted });
    } catch (err) {
        console.error('[sources] /bulk error:', err.message);
        res.status(500).json({ error: 'Bulk insert failed' });
    }
});

/**
 * DELETE /sources/:id
 * Remove a specific source by ID.
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM sources WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('[sources] DELETE error:', err.message);
        res.status(500).json({ error: 'Failed to delete source' });
    }
});

module.exports = router;
