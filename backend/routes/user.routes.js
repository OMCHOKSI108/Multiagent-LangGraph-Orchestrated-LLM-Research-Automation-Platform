const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Generate API Key
router.post('/apikey/generate', auth, async (req, res) => {
    try {
        const key = crypto.randomBytes(32).toString('hex'); // 64 chars
        const name = req.body.name || "Default Key";

        const result = await db.query(
            "INSERT INTO api_keys (user_id, key_value, name) VALUES ($1, $2, $3) RETURNING *",
            [req.user.id, key, name]
        );

        res.json({ message: "API Key Generated", key: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get User History
router.get('/history', auth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, task, status, created_at, workspace_name
             FROM (
                SELECT rl.id, rl.title, rl.task, rl.status, rl.created_at, NULL::text AS workspace_name
                FROM research_logs rl
                WHERE rl.user_id = $1

                UNION ALL

                SELECT rs.id, rs.title, rs.topic AS task, rs.status, rs.created_at, w.name AS workspace_name
                FROM research_sessions rs
                LEFT JOIN workspaces w ON rs.workspace_id = w.id
                WHERE rs.user_id = $1
             ) combined
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        // Fallback for environments that have not run workspace migrations yet.
        try {
            const fallback = await db.query(
                "SELECT id, title, task, status, created_at, NULL::text AS workspace_name FROM research_logs WHERE user_id = $1 ORDER BY created_at DESC",
                [req.user.id]
            );
            return res.json(fallback.rows);
        } catch (fallbackErr) {
            console.error(fallbackErr);
            return res.status(500).json({ error: "Server error" });
        }
    }
});

module.exports = router;
