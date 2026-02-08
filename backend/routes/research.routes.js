const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

const logger = require('../utils/logger');

// Start Research (Async Queue)
// User must provide: { task, depth, api_key }
router.post('/start', async (req, res) => {
    try {
        const { task, depth, api_key } = req.body;

        if (!api_key) return res.status(401).json({ error: "API Key Required" });
        if (!task) return res.status(400).json({ error: "Task Required" });

        // 1. Validate API Key
        const keyCheck = await db.query(
            "SELECT * FROM api_keys WHERE key_value = $1 AND is_active = TRUE",
            [api_key]
        );

        if (keyCheck.rows.length === 0) {
            logger.warn(`Invalid API Key attempt: ${api_key}`);
            return res.status(403).json({ error: "Invalid or Inactive API Key" });
        }

        const user_id = keyCheck.rows[0].user_id;

        // 2. Insert into Queue
        const log = await db.query(
            "INSERT INTO research_logs (user_id, title, task, status) VALUES ($1, $2, $3, 'queued') RETURNING id",
            [user_id, task, task]
        );
        const jobId = log.rows[0].id;

        // 3. Update Usage
        await db.query("UPDATE api_keys SET usage_count = usage_count + 1 WHERE id = $1", [keyCheck.rows[0].id]);

        logger.info(`[Node] Queued Job #${jobId} for User #${user_id}`);

        // 4. Return Immediate Response
        res.status(202).json({
            message: "Research Job Queued",
            job_id: jobId,
            status_url: `/research/status/${jobId}`
        });

    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Check Status
router.get('/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query("SELECT id, status, result_json, created_at, updated_at FROM research_logs WHERE id = $1", [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Job not found" });

        res.json(result.rows[0]);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


// Unified Web Search (Proxy to AI Engine)
// Requires API Key for authentication
router.post('/search', async (req, res) => {
    try {
        const { query, providers, max_results, api_key } = req.body;

        if (!api_key) return res.status(401).json({ error: "API Key Required" });
        if (!query) return res.status(400).json({ error: "Query Required" });

        // Validate API Key
        const keyCheck = await db.query(
            "SELECT * FROM api_keys WHERE key_value = $1 AND is_active = TRUE",
            [api_key]
        );

        if (keyCheck.rows.length === 0) {
            return res.status(403).json({ error: "Invalid or Inactive API Key" });
        }

        // Proxy to AI Engine
        const aiResponse = await axios.post(`${AI_ENGINE_URL}/search`, {
            query,
            providers: providers || null,
            max_results: max_results || 10
        }, { timeout: 15000 });

        res.json(aiResponse.data);

    } catch (err) {
        if (err.response) {
            logger.error(`[Search] AI Engine error: ${err.response.status}`);
            return res.status(502).json({ error: "Search service error" });
        }
        logger.error(`[Search] ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

// Rename Research
// PATCH /research/:id/rename
router.patch('/:id/rename', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title || typeof title !== 'string') {
            return res.status(400).json({ error: "Title is required" });
        }

        const result = await db.query(
            "UPDATE research_logs SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title",
            [title.trim(), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Research not found" });
        }

        logger.info(`[Node] Renamed research #${id} to "${title.trim()}"`);
        res.json({ success: true, research: result.rows[0] });

    } catch (err) {
        logger.error(`[Rename] ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
