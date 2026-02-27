const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

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
        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';
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

        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';
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
        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';
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
                timeout: 30000
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

module.exports = router;
