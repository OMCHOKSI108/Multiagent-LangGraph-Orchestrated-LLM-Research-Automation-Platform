const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');

let memoriesSchemaReady = false;

async function ensureMemoriesSchema() {
    if (memoriesSchemaReady) return;

    await db.query(`
        CREATE TABLE IF NOT EXISTS user_memories (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            source VARCHAR(50) DEFAULT 'manual',
            source_id INTEGER,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query('CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_memories_source ON user_memories(user_id, source)');

    memoriesSchemaReady = true;
}

/**
 * List user memories (paginated).
 *
 * GET /memories?page=1&limit=20&source=manual
 */
router.get('/', async (req, res) => {
    try {
        await ensureMemoriesSchema();

        const user_id = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const source = req.query.source;

        let query = `SELECT id, content, source, source_id, metadata, created_at, updated_at
                     FROM user_memories WHERE user_id = $1`;
        const params = [user_id];

        if (source) {
            query += ` AND source = $${params.length + 1}`;
            params.push(source);
        }

        // Get total count (build explicitly to avoid brittle regex replacement)
        let countQuery = `SELECT COUNT(*) FROM user_memories WHERE user_id = $1`;
        const countParams = [user_id];
        if (source) {
            countQuery += ` AND source = $2`;
            countParams.push(source);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        // Get page of results
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        res.json({
            memories: result.rows,
            total,
            page,
            limit
        });
    } catch (err) {
        logger.error(`[Memories] List error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Create a new memory.
 *
 * POST /memories
 * Body: { content, source?, metadata? }
 */
router.post('/', async (req, res) => {
    try {
        await ensureMemoriesSchema();

        const user_id = req.user.id;
        const { content, source, source_id, metadata } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const result = await db.query(
            `INSERT INTO user_memories (user_id, content, source, source_id, metadata)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, content, source, source_id, metadata, created_at`,
            [user_id, content.trim(), source || 'manual', source_id || null, metadata || {}]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error(`[Memories] Create error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Delete a memory (ownership check).
 *
 * DELETE /memories/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        await ensureMemoriesSchema();

        const user_id = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM user_memories WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Memory not found or unauthorized' });
        }

        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        logger.error(`[Memories] Delete error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Search memories by keyword.
 *
 * POST /memories/search
 * Body: { query, limit? }
 */
router.post('/search', async (req, res) => {
    try {
        await ensureMemoriesSchema();

        const user_id = req.user.id;
        const { query } = req.body;
        const limit = Math.min(parseInt(req.body.limit) || 20, 100);

        if (!query || !query.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchPattern = `%${query.trim()}%`;

        const result = await db.query(
            `SELECT id, content, source, source_id, metadata, created_at
             FROM user_memories
             WHERE user_id = $1 AND content ILIKE $2
             ORDER BY created_at DESC
             LIMIT $3`,
            [user_id, searchPattern, limit]
        );

        res.json({ results: result.rows, query: query.trim() });
    } catch (err) {
        logger.error(`[Memories] Search error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
