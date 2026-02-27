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
            "SELECT id, title, task, status, created_at FROM research_logs WHERE user_id = $1 ORDER BY created_at DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
