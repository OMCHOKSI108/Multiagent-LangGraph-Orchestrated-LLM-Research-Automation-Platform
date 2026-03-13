const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Apply base authentication then admin authorization to all routes in this router
router.use(auth);
router.use(adminAuth);

/**
 * 1. GET /admin/users
 * List all users with aggregated stats (workspace count, research count).
 */
router.get('/users', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.email,
                COALESCE(u.role, 'user') AS role,
                u.is_active,
                u.created_at,
                (SELECT COUNT(*) FROM workspaces w WHERE w.user_id = u.id) as workspace_count,
                (SELECT COUNT(*) FROM research_logs rl WHERE rl.user_id = u.id) as research_count,
                (SELECT MAX(created_at) FROM research_logs rl WHERE rl.user_id = u.id) as last_active
            FROM users u
            ORDER BY u.created_at DESC
        `;
        const result = await db.query(query);

        const users = result.rows.map(user => ({
            ...user,
            status: user.is_active ? 'active' : 'disabled'
        }));

        res.json({ users });
    } catch (err) {
        console.error('[Admin] Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * 2. POST /admin/users/:id/disable
 * Disable or re-enable a user via the is_active flag.
 */
router.post('/users/:id/disable', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const { action } = req.body; // 'disable' or 'enable'

        if (action !== 'disable' && action !== 'enable') {
            return res.status(400).json({ error: "action must be 'disable' or 'enable'" });
        }

        const isActive = action === 'enable';
        
        // Prevent admin from disabling themselves
        if (!isActive && userId === req.user.id) {
            return res.status(400).json({ error: "You cannot disable your own admin account" });
        }

        const result = await db.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, email, is_active',
            [isActive, userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ message: `User ${action}d successfully`, user: result.rows[0] });
    } catch (err) {
        console.error('[Admin] Error disabling user:', err);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

/**
 * 3. DELETE /admin/users/:id
 * Delete a user and cascade.
 */
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        // Note: DELETE Cascade should handle workspaces, research_logs, chat_history, etc.
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('[Admin] Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

/**
 * 4. GET /admin/stats/overview
 * Combined stats for the dashboard.
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const usersResult = await db.query('SELECT COUNT(*) FROM users');

        let workspacesResult = { rows: [{ count: 0 }] };
        try {
            workspacesResult = await db.query('SELECT COUNT(*) FROM workspaces');
        } catch (e) {
            // fallback if workspaces table doesn't exist yet
        }

        const researchResult = await db.query('SELECT COUNT(*) FROM research_logs');
        const activeResearchResult = await db.query('SELECT COUNT(*) FROM research_logs WHERE status IN ($1, $2)', ['queued', 'processing']);

        res.json({
            stats: {
                total_users: parseInt(usersResult.rows[0].count),
                total_workspaces: parseInt(workspacesResult.rows[0].count),
                total_research_jobs: parseInt(researchResult.rows[0].count),
                active_research_jobs: parseInt(activeResearchResult.rows[0].count)
            }
        });
    } catch (err) {
        console.error('[Admin] Error fetching overview stats:', err);
        res.status(500).json({ error: 'Failed to fetch overview stats' });
    }
});

/**
 * 5. GET /admin/logs
 */
router.get('/logs', (req, res) => {
    res.json({ logs: ["Admin log access not fully implemented. Check stdout."] });
});

/**
 * 6. GET /admin/research
 * List all research logs across all users.
 */
router.get('/research', async (req, res) => {
    try {
        const query = `
            SELECT 
                rl.*, 
                u.email as user_email 
            FROM research_logs rl
            LEFT JOIN users u ON rl.user_id = u.id
            ORDER BY rl.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ research_logs: result.rows });
    } catch (err) {
        console.error('[Admin] Error fetching research logs:', err);
        res.status(500).json({ error: 'Failed to fetch research' });
    }
});

/**
 * 7. GET /admin/workspaces
 * List all workspaces across all users.
 */
router.get('/workspaces', async (req, res) => {
    try {
        const query = `
            SELECT 
                w.*, 
                u.email as owner_email,
                COUNT(rs.id) AS session_count
            FROM workspaces w
            LEFT JOIN users u ON w.user_id = u.id
            LEFT JOIN research_sessions rs ON rs.workspace_id = w.id
            WHERE w.status = 'active'
            GROUP BY w.id, u.email
            ORDER BY w.created_at DESC
        `;
        const result = await db.query(query);
        res.json({ workspaces: result.rows });
    } catch (err) {
        console.error('[Admin] Error fetching workspaces:', err);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});

/**
 * 8. DELETE /admin/workspaces/:wid
 * Soft delete a workspace globally.
 */
router.delete('/workspaces/:wid', async (req, res) => {
    try {
        const { wid } = req.params;
        const result = await db.query(
            `UPDATE workspaces
             SET status = 'archived', updated_at = NOW()
             WHERE id = $1 AND status = 'active'
             RETURNING id`,
            [wid]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
        res.json({ success: true, message: 'Workspace archived by admin' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 9. PATCH /admin/workspaces/:wid
 * Edit a workspace globally.
 */
router.patch('/workspaces/:wid', async (req, res) => {
    try {
        const { wid } = req.params;
        const { name, description } = req.body;
        const result = await db.query(
            `UPDATE workspaces 
             SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
             WHERE id = $3 AND status = 'active'
             RETURNING *`,
            [name, description, wid]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
        res.json({ workspace: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 10. GET /admin/chat/sessions
 * List all chat sessions.
 */
router.get('/chat/sessions', async (req, res) => {
    try {
        const query = `
            SELECT ch.session_id, u.email as user_email, MAX(ch.created_at) as last_activity, COUNT(*) as message_count
            FROM chat_history ch
            LEFT JOIN users u ON ch.user_id = u.id
            GROUP BY ch.session_id, u.email
            ORDER BY last_activity DESC
        `;
        const result = await db.query(query);
        res.json({ sessions: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * 11. GET /admin/chat/history/:session_id
 * View transcript of a session.
 */
router.get('/chat/history/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        const result = await db.query(
            `SELECT role, message, created_at FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC`,
            [session_id]
        );
        res.json({ transcript: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
});

/**
 * 12. GET /admin/memories
 * List all memories globally.
 */
router.get('/memories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, u.email as user_email 
            FROM user_memories m
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
        `);
        res.json({ memories: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * 13. POST /admin/memories/search
 * Search all memories globally.
 */
router.post('/memories/search', async (req, res) => {
    try {
        const { query } = req.body;
        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';

        // Use ILIKE for basic text search if AI engine isn't integrated for global search,
        // but since AI engine usually handles semantic search, we will emulate it with ILIKE for admin to be safe
        const dbRes = await db.query(`
            SELECT m.*, u.email as user_email 
            FROM user_memories m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.content ILIKE $1
            ORDER BY m.created_at DESC
        `, [`%${query}%`]);

        res.json({ results: dbRes.rows });
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * 14. DELETE /admin/memories/:id
 * Delete any memory.
 */
router.delete('/memories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM user_memories WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Memory not found' });
        res.json({ success: true, message: 'Memory deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

/**
 * 15. GET /admin/api-keys
 * List all API keys.
 */
router.get('/api-keys', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT ak.id, ak.name as key_name, ak.key_value, ak.is_active, ak.created_at,
                   u.email as user_email, u.id as user_id
            FROM api_keys ak
            LEFT JOIN users u ON ak.user_id = u.id
            ORDER BY ak.created_at DESC
        `);
        res.json({ keys: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch api keys' });
    }
});

/**
 * 16. POST /admin/api-keys/generate
 * Admin generates key for user.
 */
const crypto = require('crypto');
router.post('/api-keys/generate', async (req, res) => {
    try {
        const { user_email, key_name } = req.body;
        // find user
        const uRes = await db.query('SELECT id FROM users WHERE email = $1', [user_email]);
        if (uRes.rows.length === 0) return res.status(404).json({ error: 'User email not found' });
        const user_id = uRes.rows[0].id;

        const rawKey = crypto.randomBytes(32).toString('hex');
        const finalKey = `dr_live_${rawKey}`;

        const result = await db.query(
            `INSERT INTO api_keys (user_id, key_name, key_value, is_active)
             VALUES ($1, $2, $3, TRUE)
             RETURNING id, key_name, key_value, created_at, is_active`,
            [user_id, key_name || 'Admin Generated Key', finalKey]
        );
        res.json({ key: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate key' });
    }
});

/**
 * 17. DELETE /admin/api-keys/:id
 * Revoke key.
 */
router.delete('/api-keys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Key not found' });
        res.json({ success: true, message: 'Key revoked' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke key' });
    }
});

module.exports = router;
