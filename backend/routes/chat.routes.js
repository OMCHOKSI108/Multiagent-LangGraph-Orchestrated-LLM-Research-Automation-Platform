const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const sessionKeyAuth = require('../middleware/sessionKeyAuth');
const auth = require('../middleware/auth');

/**
 * Enhanced fetch RAG context from workspace vector store.
 */
async function fetchVectorContext(workspaceId, query) {
    if (!workspaceId) return '';
    try {
        const resp = await axios.post(`${AI_ENGINE_URL}/vectorstore/search`, {
            workspace_id: workspaceId,
            query: query,
            top_k: 8 // Increased for better depth
        }, { timeout: 8000 });
        const results = resp.data?.results || [];
        if (results.length === 0) return '';
        return results.map((r, i) =>
            `[Source ${i + 1}] (relevance: ${(r.relevance_score * 100).toFixed(0)}%)\n${r.text}`
        ).join('\n\n');
    } catch (err) {
        logger.warn(`[Chat] Vector search failed: ${err.message}`);
        return '';
    }
}

/**
 * Unified request authenticator - handles JWT and API Key.
 */
async function authenticateRequest(req, res, next) {
    const token = req.header('x-auth-token') || req.header('Authorization');
    if (token) {
        return auth(req, res, next);
    }
    return apiKeyAuth(req, res, next);
}

async function getResearchContextForUser(researchId, userId) {
    // Try research_logs first
    const legacyResult = await db.query(
        "SELECT result_json, user_id FROM research_logs WHERE id = $1",
        [researchId]
    );
    if (legacyResult.rows.length > 0) {
        return legacyResult.rows[0];
    }

    // Fallback to research_sessions (workspace flow)
    try {
        const sessResult = await db.query(
            `SELECT rs.result_json, rs.user_id
             FROM research_sessions rs
             JOIN workspaces w ON rs.workspace_id = w.id
             WHERE rs.id = $1 AND w.user_id = $2`,
            [researchId, userId]
        );
        if (sessResult.rows.length > 0) return sessResult.rows[0];
    } catch (e) { /* table may not exist */ }

    return null;
}

// Send Message to Chatbot
// Input: { research_id, message, session_id (optional) }
router.post('/message', authenticateRequest, async (req, res) => {
    try {
        const { research_id, message } = req.body;
        let { session_id } = req.body;
        const user_id = req.user.id;

        if (!research_id || !message) return res.status(400).json({ error: "Research ID and Message required" });

        // 2. Fetch Research Context — supports both legacy and workspace flow
        const researchRow = await getResearchContextForUser(research_id, user_id);

        if (!researchRow) return res.status(404).json({ error: "Research not found" });

        const context = researchRow.result_json || {};

        // 2b. Fetch workspace RAG context from vector store
        const workspaceId = req.body.workspace_id || await resolveWorkspaceId(research_id);
        const ragContext = await fetchVectorContext(workspaceId, message);
        if (ragContext) {
            context.vector_rag_context = ragContext;
        }

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
                task: message,
                findings: context,
                depth: "deep"
            });

            // Accept different payload shapes from AI engine without breaking chat.
            const payload = aiResponse?.data || {};
            let botResponse = payload?.response?.response;
            if (botResponse == null) botResponse = payload?.response;
            if (botResponse == null) botResponse = payload;

            const replyText = typeof botResponse === 'string' ? botResponse : JSON.stringify(botResponse);

            // Validate response before proceeding
            if (!replyText || typeof replyText !== 'string') {
                throw new Error('Invalid agent response format: empty or non-string response');
            }

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

// Streaming Chat via SSE
// Input: { research_id, message, session_id (optional) }
router.post('/stream', authenticateRequest, async (req, res) => {
    try {
        const { research_id, message } = req.body;
        let { session_id } = req.body;
        const user_id = req.user.id;

        if (!research_id || !message) return res.status(400).json({ error: "Research ID and Message required" });

        // 2. Fetch Research Context — supports both legacy and workspace flow
        const researchRow = await getResearchContextForUser(research_id, user_id);
        if (!researchRow) return res.status(404).json({ error: "Research not found" });

        const context = researchRow.result_json || {};

        // 2b. Fetch workspace RAG context from vector store
        const workspaceId = req.body.workspace_id || await resolveWorkspaceId(research_id);
        const ragContext = await fetchVectorContext(workspaceId, message);
        if (ragContext) {
            context.vector_rag_context = ragContext;
        }

        // 3. Fetch user memories for context enrichment
        let memoriesContext = {};
        try {
            const memories = await db.query(
                "SELECT content FROM user_memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
                [user_id]
            );
            if (memories.rows.length > 0) {
                memoriesContext.user_memories = memories.rows.map(m => m.content).join('\n');
            }
        } catch (memErr) {
            logger.warn(`[Chat] Could not fetch memories: ${memErr.message}`);
        }

        // 4. Setup Session
        if (!session_id) session_id = uuidv4();

        // 5. Save User Message
        await db.query(
            "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
            [session_id, user_id, 'user', message]
        );

        // 6. Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // CORS is handled by global middleware — do not override here
        res.setHeader('X-Session-ID', session_id);
        res.flushHeaders();

        // 7. Stream from AI Engine
        logger.info(`[Chat] Streaming for Session ${session_id}`);
        let fullResponse = '';

        try {
            const aiResponse = await axios.post(
                `${AI_ENGINE_URL}/agent/interactive_chatbot/stream`,
                {
                    task: message,
                    findings: { ...context, ...memoriesContext },
                    depth: "deep"
                },
                {
                    responseType: 'stream',
                    timeout: 120000
                }
            );

            aiResponse.data.on('data', (chunk) => {
                const text = chunk.toString();
                // Forward the SSE data directly
                res.write(text);

                // Collect full response text (strip SSE prefix)
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]') && !line.includes('[ERROR]')) {
                        fullResponse += line.substring(6);
                    }
                }
            });

            aiResponse.data.on('end', async () => {
                // Save bot response to chat_history
                if (fullResponse.trim()) {
                    try {
                        await db.query(
                            "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
                            [session_id, user_id, 'assistant', fullResponse.trim()]
                        );
                    } catch (saveErr) {
                        logger.error(`[Chat] Save error: ${saveErr.message}`);
                    }
                }
                res.end();
            });

            aiResponse.data.on('error', (err) => {
                logger.error(`[Chat] Stream error: ${err.message}`);
                res.write(`data: [ERROR] ${err.message}\n\n`);
                res.end();
            });

        } catch (aiErr) {
            logger.error(`[Chat] AI Stream Error: ${aiErr.message}`);
            res.write(`data: [ERROR] AI Service Unavailable\n\n`);
            res.end();
        }

        // Cleanup on client disconnect
        req.on('close', () => {
            logger.info(`[Chat] Client disconnected for Session ${session_id}`);
        });

    } catch (err) {
        logger.error(`[Chat] Stream setup error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
});

// Get Chat History
router.get('/history/:session_id', authenticateRequest, async (req, res) => {
    try {
        const { session_id } = req.params;
        const userId = req.user?.id;
        const result = await db.query(
            `SELECT id, role, message, created_at
             FROM chat_history
             WHERE session_id = $1 AND user_id = $2
             ORDER BY created_at ASC`,
            [session_id, userId]
        );

        const messages = result.rows.map((row) => ({
            id: row.id,
            role: row.role,
            content: row.message,
            created_at: row.created_at
        }));

        res.json({ messages });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @route   POST /api/chat/fast
 * @desc    Fast high-speed chat for general queries (Conversational Mode)
 * @access  Private (JWT or API Key)
 */
router.post('/fast', authenticateRequest, async (req, res) => {
    try {
        const { message } = req.body;
        let { session_id } = req.body;
        const user_id = req.user.id;

        if (!message) return res.status(400).json({ error: "Message required" });

        // 1. Setup Session
        if (!session_id) session_id = uuidv4();

        // 2. Fetch recent history for context
        const historyResult = await db.query(
            "SELECT role, message as content FROM chat_history WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10",
            [session_id]
        );
        const history = historyResult.rows.reverse();

        // 3. Save User Message
        await db.query(
            "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
            [session_id, user_id, 'user', message]
        );

        // 4. Call Python AI Engine fast-chat
        logger.info(`[FastChat] Sending message to AI for Session ${session_id}`);
        try {
            const aiResponse = await axios.post(`${AI_ENGINE_URL}/chatbot/fast-chat`, {
                query: message,
                history: history,
                context: "" // General chat
            }, {
                headers: {
                    'X-API-Key': process.env.AI_ENGINE_SECRET || ""
                },
                timeout: 65000 
            });

            const payload = aiResponse?.data || {};
            const replyText = payload?.response || payload?.reply || payload;
            const sources = payload?.sources || [];
            const searchMode = payload?.search_mode || 'direct';

            if (!replyText || typeof replyText !== 'string') {
                throw new Error("Invalid response from AI Engine");
            }

            // 5. Save Bot Response
            await db.query(
                "INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)",
                [session_id, user_id, 'assistant', replyText]
            );

            res.json({
                session_id,
                reply: replyText,
                agent: "ConversationalAgent",
                sources: sources,
                search_mode: searchMode
            });

        } catch (aiErr) {
            logger.error(`[FastChat] AI Error: ${aiErr.message}`);
            res.status(502).json({ error: "Conversational Service Unavailable" });
        }

    } catch (err) {
        logger.error(`[FastChat] Route error: ${err.message}`);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
