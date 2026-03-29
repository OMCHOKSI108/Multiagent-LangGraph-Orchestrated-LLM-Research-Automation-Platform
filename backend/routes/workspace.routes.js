const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { detectIntent } = require('../utils/intentDetector');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai_engine:8000';
const AI_ENGINE_SECRET = process.env.AI_ENGINE_SECRET || '';

// ============================================
// GET /workspaces — List all workspaces for user
// ============================================
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT w.*,
                    COUNT(rs.id) AS session_count,
                    MAX(rs.updated_at) AS last_activity
             FROM workspaces w
             LEFT JOIN research_sessions rs ON rs.workspace_id = w.id
             WHERE w.user_id = $1 AND w.status = 'active'
             GROUP BY w.id
             ORDER BY w.updated_at DESC`,
            [userId]
        );

        res.json({ workspaces: result.rows });
    } catch (err) {
        logger.error(`[Workspace] List failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// POST /workspaces — Create a new workspace
// ============================================
router.post('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Workspace name is required' });
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 255) {
            return res.status(400).json({ error: 'Name must be under 255 characters' });
        }

        const result = await db.query(
            `INSERT INTO workspaces (user_id, name, description)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, trimmedName, description?.trim() || null]
        );

        logger.info(`[Workspace] Created "${trimmedName}" for user #${userId}`);
        res.status(201).json({ workspace: result.rows[0] });
    } catch (err) {
        logger.error(`[Workspace] Create failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET /workspaces/:wid — Get workspace details + sessions
// ============================================
router.get('/:wid', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid } = req.params;

        // Fetch workspace
        const wsResult = await db.query(
            `SELECT * FROM workspaces WHERE id = $1 AND user_id = $2 AND status = 'active'`,
            [wid, userId]
        );

        if (wsResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Fetch sessions within workspace
        const sessionsResult = await db.query(
            `SELECT id, topic, refined_topic, title, status, depth,
                    current_stage, started_at, completed_at,
                    created_at, updated_at
             FROM research_sessions
             WHERE workspace_id = $1 AND user_id = $2
             ORDER BY created_at DESC`,
            [wid, userId]
        );

        // Fetch uploads
        const uploadsResult = await db.query(
            `SELECT id, filename, file_type, file_size_bytes,
                    embedding_status, chunk_count, created_at
             FROM workspace_uploads
             WHERE workspace_id = $1
             ORDER BY created_at DESC`,
            [wid]
        );

        res.json({
            workspace: wsResult.rows[0],
            sessions: sessionsResult.rows,
            uploads: uploadsResult.rows
        });
    } catch (err) {
        logger.error(`[Workspace] Get failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// PATCH /workspaces/:wid — Rename/update workspace
// ============================================
router.patch('/:wid', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid } = req.params;
        const { name, description } = req.body;

        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name && typeof name === 'string' && name.trim()) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name.trim());
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description?.trim() || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(wid, userId);

        const result = await db.query(
            `UPDATE workspaces SET ${updates.join(', ')}
             WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        res.json({ workspace: result.rows[0] });
    } catch (err) {
        logger.error(`[Workspace] Update failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// DELETE /workspaces/:wid — Archive workspace (soft delete)
// ============================================
router.delete('/:wid', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid } = req.params;

        const result = await db.query(
            `UPDATE workspaces
             SET status = 'archived', updated_at = NOW()
             WHERE id = $1 AND user_id = $2 AND status = 'active'
             RETURNING id`,
            [wid, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        logger.info(`[Workspace] Archived workspace ${wid} for user #${userId}`);
        res.json({ success: true, message: 'Workspace archived' });
    } catch (err) {
        logger.error(`[Workspace] Delete failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// POST /workspaces/:wid/research/start — Start new research session
// ============================================
router.post('/:wid/research/start', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid } = req.params;
        const { topic, depth } = req.body;

        // Validate inputs
        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Verify workspace ownership
        const wsCheck = await db.query(
            `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2 AND status = 'active'`,
            [wid, userId]
        );

        if (wsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const trimmedTopic = topic.trim();
        const researchDepth = depth || 'deep';

        // ── Smart Intent Detection ──────────────────────────────────────────
        // Fetch user's name for personalised replies
        const userRow = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
        const userName = userRow.rows[0]?.username || 'there';

        // Fix: Bypass intent detection if a user-specified depth (slash command) is present.
        // This ensures commands like /gatherdata always trigger research even if the query starts with conversational words.
        const { intent, reply: instantReply, isResearch } = (depth && depth !== 'standard')
            ? { intent: 'research', reply: null, isResearch: true }
            : detectIntent(trimmedTopic, userName);

        if (!isResearch) {
            logger.info(`[Workspace] Intent "${intent}" detected for user #${userId}`);
            
            // If it's a general query, call AI Engine for a fast real-time response
            if (intent === 'general_query' && !instantReply) {
                try {
                    
                    // Fetch recent history if a session_id was optionally provided in the request
                    let history = [];
                    const { session_id } = req.body;
                    if (session_id) {
                        const historyResult = await db.query(
                            "SELECT role, message as content FROM chat_history WHERE session_id = $1 ORDER BY created_at DESC LIMIT 6",
                            [session_id]
                        );
                        history = historyResult.rows.reverse().map(m => ({
                            role: m.role === 'assistant' ? 'ai' : m.role,
                            content: m.content
                        }));
                    }

                    const aiRes = await axios.post(`${AI_ENGINE_URL}/chatbot/fast-chat`, {
                        query: trimmedTopic,
                        history: history,
                        context: ""
                    }, {
                        headers: { 'X-API-Key': AI_ENGINE_SECRET },
                        timeout: 60000
                    });
                    
                    const replyText = aiRes.data?.response || "I couldn't generate a fast response. Try /research.";

                    // Optional: Save this interaction even if it's "instant" if session_id exists
                    if (session_id) {
                        await db.query("INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)", [session_id, userId, 'user', trimmedTopic]);
                        await db.query("INSERT INTO chat_history (session_id, user_id, role, message) VALUES ($1, $2, $3, $4)", [session_id, userId, 'assistant', replyText]);
                    }

                    return res.status(200).json({
                        intent,
                        instant_reply: replyText,
                        session_id: session_id || null,
                    });
                } catch (aiErr) {
                    logger.error(`[Workspace] Fast-chat failed: ${aiErr.message}`);
                    return res.status(502).json({ error: 'Conversational engine unavailable' });
                }
            }

            return res.status(200).json({
                intent,
                instant_reply: instantReply,
                session_id: null,
            });
        }
        // ───────────────────────────────────────────────────────────────────

        // Insert new research session with explicit user trigger
        const result = await db.query(
            `INSERT INTO research_sessions
                (workspace_id, user_id, topic, title, status, trigger_source, depth)
             VALUES ($1, $2, $3, $4, 'queued', 'user', $5)
             RETURNING id, topic, title, status, depth, created_at`,
            [wid, userId, trimmedTopic, trimmedTopic, researchDepth]
        );

        const session = result.rows[0];

        logger.info(`[Workspace] Research session #${session.id} queued: "${trimmedTopic}" in workspace ${wid}`);

        res.status(202).json({
            message: 'Research session queued',
            session_id: session.id,
            workspace_id: wid,
            topic: trimmedTopic,
            status: 'queued',
            status_url: `/workspaces/${wid}/research/${session.id}/status`
        });
    } catch (err) {
        logger.error(`[Workspace] Research start failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET /workspaces/:wid/research/:sid/status — Check session status
// ============================================
router.get('/:wid/research/:sid/status', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid, sid } = req.params;

        const result = await db.query(
            `SELECT id, topic, refined_topic, title, status, depth,
                    result_json, report_markdown, latex_source,
                    current_stage, started_at, completed_at,
                    created_at, updated_at
             FROM research_sessions
             WHERE id = $1 AND workspace_id = $2 AND user_id = $3`,
            [sid, wid, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research session not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error(`[Workspace] Status check failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// POST /workspaces/:wid/research/:sid/topic — Lock topic selection
// ============================================
router.post('/:wid/research/:sid/topic', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid, sid } = req.params;
        const { topic } = req.body;

        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const normalizedTopic = topic.trim();
        const sessionId = Number.parseInt(sid, 10);

        // Update refined topic in session
        const updateResult = await db.query(
            `UPDATE research_sessions
             SET refined_topic = $1,
                 title = $1,
                 updated_at = NOW()
             WHERE id = $2 AND workspace_id = $3 AND user_id = $4
             RETURNING id`,
            [normalizedTopic, sessionId, wid, userId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Notify AI Engine
        try {
            const axios = require('axios');
            await axios.post(`${AI_ENGINE_URL}/research/update-state`, {
                research_id: sessionId,
                state_update: {
                    selected_topic: normalizedTopic,
                    topic_locked: true
                }
            });
        } catch (aiErr) {
            logger.warn(`[Workspace] Failed to update AI Engine state: ${aiErr.message}`);
        }

        res.json({ success: true, topic: normalizedTopic });
    } catch (err) {
        logger.error(`[Workspace] Topic lock failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// GET /workspaces/:wid/research/:sid/suggestions — Topic suggestions
// ============================================
router.get('/:wid/research/:sid/suggestions', auth, async (req, res) => {
    try {
        const sessionId = Number.parseInt(req.params.sid, 10);

        const axios = require('axios');
        const aiRes = await axios.get(`${AI_ENGINE_URL}/research/${sessionId}/suggestions`, {
            timeout: 5000
        });
        res.json(aiRes.data);
    } catch (err) {
        res.json({ topic_locked: false, selected_topic: null, topic_suggestions: [] });
    }
});

// ============================================
// GET /workspaces/:wid/sources — List scraped sources
// ============================================
router.get('/:wid/sources', auth, async (req, res) => {
    try {
        const { wid } = req.params;
        const userId = req.user.id;

        // Verify workspace ownership
        const wsCheck = await db.query(
            `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2`,
            [wid, userId]
        );
        if (wsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const result = await db.query(
            `SELECT ds.*
             FROM data_sources ds
             JOIN research_sessions rs ON ds.research_id = rs.id
             WHERE rs.workspace_id = $1
             ORDER BY ds.created_at DESC`,
            [wid]
        );

        res.json({ sources: result.rows });
    } catch (err) {
        logger.error(`[Workspace] Sources list failed: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// POST /workspaces/:wid/upload — Upload file for RAG embedding
// ============================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const os = require('os');

const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.md', '.pdf', '.csv', '.json', '.tex'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error(`File type ${ext} not supported (allowed: ${allowed.join(', ')})`));
    }
});

router.post('/:wid/upload', auth, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { wid } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Verify workspace ownership
        const wsCheck = await db.query(
            `SELECT id FROM workspaces WHERE id = $1 AND user_id = $2 AND status = 'active'`,
            [wid, userId]
        );
        if (wsCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        const filePath = req.file.path;
        const ext = path.extname(req.file.originalname).toLowerCase();
        let textContent = '';

        // Extract text from file
        if (['.txt', '.md', '.csv', '.json', '.tex'].includes(ext)) {
            textContent = fs.readFileSync(filePath, 'utf-8');
        } else if (ext === '.pdf') {
            // For PDF: read as text (basic extraction)
            // In production, use a proper PDF parser
            try {
                textContent = fs.readFileSync(filePath, 'utf-8');
            } catch (e) {
                textContent = `[PDF file: ${req.file.originalname}]`;
            }
        }

        // Clean up temp file
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

        if (!textContent || textContent.trim().length < 10) {
            return res.status(400).json({ error: 'File is empty or could not be read' });
        }

        // Record upload in database
        let uploadId = null;
        try {
            const insertResult = await db.query(
                `INSERT INTO workspace_uploads
                    (workspace_id, filename, file_type, file_size_bytes, embedding_status)
                 VALUES ($1, $2, $3, $4, 'processing')
                 RETURNING id`,
                [wid, req.file.originalname, ext, req.file.size]
            );
            uploadId = insertResult.rows[0].id;
        } catch (e) {
            logger.warn(`[Upload] Could not record in DB: ${e.message}`);
        }

        // Send to AI Engine for chunking and embedding
        const AI_ENGINE_API_KEY = process.env.AI_ENGINE_API_KEY || '';

        try {
            const axios = require('axios');
            const ingestResp = await axios.post(`${AI_ENGINE_URL}/vectorstore/ingest`, {
                workspace_id: wid,
                text: textContent,
                source_url: `upload://${req.file.originalname}`,
                source_type: 'upload',
            }, {
                headers: { 'X-API-Key': AI_ENGINE_API_KEY },
                timeout: 60000
            });

            const chunksAdded = ingestResp.data?.chunks_added || 0;

            // Update upload status
            if (uploadId) {
                await db.query(
                    `UPDATE workspace_uploads SET embedding_status = 'completed', chunk_count = $1 WHERE id = $2`,
                    [chunksAdded, uploadId]
                );
            }

            logger.info(`[Upload] File "${req.file.originalname}" → ${chunksAdded} chunks in workspace ${wid}`);
            res.json({
                success: true,
                filename: req.file.originalname,
                chunks_added: chunksAdded,
                upload_id: uploadId
            });
        } catch (aiErr) {
            logger.error(`[Upload] Embedding failed: ${aiErr.message}`);
            if (uploadId) {
                await db.query(
                    `UPDATE workspace_uploads SET embedding_status = 'failed' WHERE id = $1`,
                    [uploadId]
                );
            }
            res.status(502).json({ error: 'Embedding service unavailable' });
        }

    } catch (err) {
        logger.error(`[Upload] Error: ${err.message}`);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @route   GET /api/workspaces/:wid/sessions/:id/sections
 * @desc    Get all sections for a research report
 * @access  Private
 */
router.get('/:wid/sessions/:id/sections', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM document_sections WHERE session_id = $1 ORDER BY section_order ASC',
            [id]
        );
        res.json({ sections: result.rows });
    } catch (err) {
        console.error('[Sections] Fetch error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   POST /api/workspaces/:wid/sessions/:id/sections/:sectionId/edit
 * @desc    Edit a specific section of a research report
 * @access  Private
 */
router.post('/:wid/sessions/:id/sections/:sectionId/edit', auth, async (req, res) => {
    try {
        const { wid, id, sectionId } = req.params;
        const { instruction } = req.body;

        if (!instruction) {
            return res.status(400).json({ error: 'Instruction is required' });
        }

        // 1. Get current section content
        const sectionResult = await db.query(
            'SELECT * FROM document_sections WHERE id = $1 AND session_id = $2',
            [sectionId, id]
        );

        if (sectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sectionResult.rows[0];

        // 2. Call AI Engine for editing

        try {
            const aiResponse = await axios.post(`${AI_ENGINE_URL}/research/edit-section`, {
                section_title: section.section_title,
                current_content: section.content_markdown,
                instruction: instruction,
                context: {} // Optional: add workspace context here
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(AI_ENGINE_SECRET ? { 'X-API-Key': AI_ENGINE_SECRET } : {})
                }
            });

            const refinedContent = aiResponse.data.refined_content;

            // 3. Update section in database
            await db.query(
                'UPDATE document_sections SET content_markdown = $1, last_edited_by = $2, updated_at = NOW() WHERE id = $3',
                [refinedContent, req.user.id, sectionId]
            );

            res.json({
                message: 'Section updated successfully',
                refined_content: refinedContent
            });

        } catch (aiErr) {
            console.error('[Editor] AI Engine error:', aiErr.message);
            res.status(502).json({ error: 'Failed to process edit instruction' });
        }

    } catch (err) {
        console.error('[Editor] Route error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route   GET /api/workspaces/:wid/sessions/:id/full-report
 * @desc    Reconstruct the full report from sections
 * @access  Private
 */
router.get('/:wid/sessions/:id/full-report', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT content_markdown FROM document_sections WHERE session_id = $1 ORDER BY section_order ASC',
            [id]
        );

        if (result.rows.length === 0) {
            // Fallback to the session's monolithic report if no sections exist yet
            const sessionResult = await db.query('SELECT report_markdown FROM research_sessions WHERE id = $1', [id]);
            const markdown = sessionResult.rows[0]?.report_markdown || "";
            return res.json({ markdown, report: markdown });
        }

        const fullReport = result.rows.map(r => r.content_markdown).join('\n\n');
        res.json({ markdown: fullReport, report: fullReport });
    } catch (err) {
        console.error('[FullReport] Compilation error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
