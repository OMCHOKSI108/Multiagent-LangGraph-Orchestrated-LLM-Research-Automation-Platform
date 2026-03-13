const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

const db = require('../config/db');
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * Proxy usage stats from AI Engine + DB counts.
 *
 * GET /usage/stats?hours=24
 */
router.get('/stats', async (req, res) => {
    try {
        const user_id = req.user.id;
        const hours = parseInt(req.query.hours) || 24;

        // 1. Get research counts from DB
        const researchStats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM research_logs 
            WHERE user_id = $1
        `, [user_id]);

        const r = researchStats.rows[0];

        // 2. Fetch from AI Engine
        let aiData = { total_tokens: 0, estimated_cost: 0, by_provider: [] };
        try {
            const aiResponse = await axios.get(`${AI_ENGINE_URL}/usage/stats`, {
                params: { hours },
                timeout: 5000
            });
            aiData = aiResponse.data;
        } catch (e) {
            logger.warn(`[Usage] AI Engine stats unreachable: ${e.message}`);
        }

        // Transform results
        const history = (aiData.by_provider || []).map((p, i) => ({
            date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            tokens: p.total_tokens || 0,
            provider: p.provider || 'unknown'
        }));

        res.json({
            total_research: parseInt(r.total) || 0,
            completed: parseInt(r.completed) || 0,
            failed: parseInt(r.failed) || 0,
            api_calls: aiData.total_requests || 0,
            totalTokens: aiData.total_tokens || 0,
            cost: aiData.estimated_cost || 0,
            history
        });
    } catch (err) {
        logger.error(`[Usage] Stats error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Test connection to an LLM provider.
 *
 * POST /usage/test-connection
 * Body: { provider, api_key }
 */
router.post('/test-connection', async (req, res) => {
    const { provider, api_key } = req.body;

    if (!provider || !api_key) {
        return res.status(400).json({ error: 'Provider and api_key required' });
    }

    const start = Date.now();

    try {
        if (provider === 'gemini') {
            // Test Gemini API with a minimal request
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${api_key}`,
                { contents: [{ parts: [{ text: 'Say OK' }] }] },
                { timeout: 15000 }
            );
            if (response.status === 200) {
                return res.json({ status: 'ok', latency: Date.now() - start });
            }
        } else if (provider === 'groq') {
            // Test Groq API
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                { model: 'llama3-8b-8192', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 },
                { headers: { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' }, timeout: 15000 }
            );
            if (response.status === 200) {
                return res.json({ status: 'ok', latency: Date.now() - start });
            }
        } else {
            return res.status(400).json({ error: `Unknown provider: ${provider}` });
        }
        res.json({ status: 'error', latency: Date.now() - start });
    } catch (err) {
        const latency = Date.now() - start;
        logger.warn(`[Usage] Connection test failed for ${provider}: ${err.message}`);
        res.json({ status: 'error', latency, error: err.response?.data?.error?.message || err.message });
    }
});

module.exports = router;
