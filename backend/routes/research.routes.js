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


module.exports = router;
