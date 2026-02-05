const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

// Send Message to Chatbot
// Input: { research_id, message, api_key, session_id (optional) }
router.post('/message', async (req, res) => {
    try {
        const { research_id, message, api_key } = req.body;
        let { session_id } = req.body;

        if (!api_key) return res.status(401).json({ error: "API Key Required" });
        if (!research_id || !message) return res.status(400).json({ error: "Research ID and Message required" });

        // 1. Validate User
        const keyCheck = await db.query("SELECT * FROM api_keys WHERE key_value = $1 AND is_active = TRUE", [api_key]);
        if (keyCheck.rows.length === 0) return res.status(403).json({ error: "Invalid API Key" });
        const user_id = keyCheck.rows[0].user_id;

        // 2. Fetch Research Context
        const research = await db.query("SELECT result_json, user_id FROM research_logs WHERE id = $1", [research_id]);
        if (research.rows.length === 0) return res.status(404).json({ error: "Research not found" });
        if (research.rows[0].user_id !== user_id) return res.status(403).json({ error: "Unauthorized access to this research" });

        const context = research.rows[0].result_json || {};

        // 3. Setup Session
        if (!session_id) session_id = uuidv4();

        // 4. Save User Message
        await db.query(
            "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
            [session_id, user_id, 'user', message]
        );

        // 5. LLM Filter / Guardrail (Simple Check)
        // We could call a dedicated 'guardrail' agent here. For now, we trust the robust Chatbot Agent.

        // 6. Call Python AI Engine
        logger.info(`[Chat] Sending message to AI for Session ${session_id}`);
        try {
            const aiResponse = await axios.post(`${AI_ENGINE_URL}/agent/interactive_chatbot`, {
                task: message, // In chatbot mode, task IS the query
                findings: context, // Inject the full research context
                depth: "deep"
            });

            const botResponse = aiResponse.data.response.response; // { agent: ..., response: { response: "text", raw: ... } } usually
            // The agent.run returns { response: "text", raw: ..., agent: ... }
            // So aiResponse.data.response IS that dict.
            // aiResponse.data.response.response IS the text.

            const replyText = typeof botResponse === 'string' ? botResponse : JSON.stringify(botResponse);

            // 7. Save Bot Response
            await db.query(
                "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
                [session_id, user_id, 'assistant', replyText]
            );

            res.json({
                session_id,
                reply: replyText,
                agent: "InteractivePaperChatbot"
            });

        } catch (aiErr) {
            logger.error(`[Chat] AI Error: ${aiErr.message}`);
            res.status(502).json({ error: "AI Service Unavailable" });
        }

    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Chat History
router.get('/history/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        const result = await db.query(
            "SELECT role, message, created_at FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC",
            [session_id]
        );
        res.json(result.rows);
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
