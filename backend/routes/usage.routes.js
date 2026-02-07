const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * Proxy usage stats from AI Engine.
 *
 * GET /usage/stats?hours=24
 */
router.get('/stats', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const aiResponse = await axios.get(`${AI_ENGINE_URL}/usage/stats`, {
            params: { hours },
            timeout: 10000
        });

        // Transform ai_engine format to frontend-expected format
        const data = aiResponse.data;
        const history = (data.by_provider || []).map((p, i) => ({
            date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            tokens: p.total_tokens || 0,
            provider: p.provider || 'unknown'
        }));

        res.json({
            totalTokens: data.total_tokens || 0,
            cost: data.estimated_cost || 0,
            history,
            raw: data
        });
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            // AI engine not running - return empty stats
            return res.json({
                totalTokens: 0,
                cost: 0,
                history: [],
                raw: null
            });
        }
        logger.error(`[Usage] Stats error: ${err.message}`);
        res.status(502).json({ error: 'Could not fetch usage stats from AI engine' });
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
