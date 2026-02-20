const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

const logger = require('../utils/logger');

// Start Research (Async Queue)
// User must provide: { task, depth, api_key }
router.post('/start', async (req, res) => {
  try {
    const { task, depth, api_key } = req.body;

    if (!api_key) return res.status(401).json({ error: "API Key Required" });
    if (!task) return res.status(400).json({ error: "Task Required" });

    // 1. Validate API Key
    const keyCheck = await db.query(
      "SELECT * FROM api_keys WHERE key_value = $1 AND is_active = TRUE",
      [api_key]
    );

    if (keyCheck.rows.length === 0) {
      logger.warn(`Invalid API Key attempt: ${api_key}`);
      return res.status(403).json({ error: "Invalid or Inactive API Key" });
    }

    const user_id = keyCheck.rows[0].user_id;

    // 2. Insert into Queue
    const log = await db.query(
      "INSERT INTO research_logs (user_id, title, task, status) VALUES ($1, $2, $3, 'queued') RETURNING id",
      [user_id, task, task]
    );
    const jobId = log.rows[0].id;

    // 3. Update Usage
    await db.query("UPDATE api_keys SET usage_count = usage_count + 1 WHERE id = $1", [keyCheck.rows[0].id]);

    logger.info(`[Node] Queued Job #${jobId} for User #${user_id}`);

    // 4. Return Immediate Response
    res.status(202).json({
      message: "Research Job Queued",
      job_id: jobId,
      status_url: `/research/status/${jobId}`
    });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Check Status
router.get('/status/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await db.query(
      `SELECT id, task, title, status, result_json, user_id,
              report_markdown, latex_source, current_stage,
              started_at, completed_at,
              created_at, updated_at
       FROM research_logs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Job not found" });

    res.json(result.rows[0]);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// Unified Web Search (Proxy to AI Engine)
// Requires API Key for authentication
router.post('/search', async (req, res) => {
  try {
    const { query, providers, max_results, api_key } = req.body;

    if (!api_key) return res.status(401).json({ error: "API Key Required" });
    if (!query) return res.status(400).json({ error: "Query Required" });

    // Validate API Key
    const keyCheck = await db.query(
      "SELECT * FROM api_keys WHERE key_value = $1 AND is_active = TRUE",
      [api_key]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(403).json({ error: "Invalid or Inactive API Key" });
    }

    // Proxy to AI Engine
    const aiResponse = await axios.post(`${AI_ENGINE_URL}/search`, {
      query,
      providers: providers || null,
      max_results: max_results || 10
    }, { timeout: 15000 });

    res.json(aiResponse.data);

  } catch (err) {
    if (err.response) {
      logger.error(`[Search] AI Engine error: ${err.response.status}`);
      return res.status(502).json({ error: "Search service error" });
    }
    logger.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Set Research Topic (Phase 0)
// POST /research/:id/topic
router.post('/:id/topic', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }
    const normalizedTopic = topic.trim();
    const researchId = Number.parseInt(id, 10);
    if (!Number.isInteger(researchId) || researchId <= 0) {
      return res.status(400).json({ error: "Invalid research id" });
    }

    // Update topic in DB
    const updateResult = await db.query(
      `UPDATE research_logs
       SET title = $1::text,
           task = $2::text,
           status = 'queued',
           current_stage = 'queued',
           started_at = NULL,
           completed_at = NULL,
           result_json = NULL,
           retry_count = 0,
           updated_at = NOW()
       WHERE id = $3::int`,
      [normalizedTopic, normalizedTopic, researchId]
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Research not found" });
    }

    // Trigger AI Engine state update
    try {
      await axios.post(`${AI_ENGINE_URL}/research/update-state`, {
        research_id: researchId,
        state_update: {
          selected_topic: normalizedTopic,
          topic_locked: true
        }
      });
    } catch (aiErr) {
      logger.warn(`[Node] Failed to update AI Engine state directly: ${aiErr.message}`);
    }

    res.json({ success: true, topic: normalizedTopic });
  } catch (err) {
    logger.error(`[Topic] ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Topic Suggestions (polling fallback)
// GET /research/:id/suggestions
router.get('/:id/suggestions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const researchId = Number.parseInt(id, 10);
    if (!Number.isInteger(researchId) || researchId <= 0) {
      return res.status(400).json({ error: "Invalid research id" });
    }

    // Fetch from AI Engine's state store
    const aiRes = await axios.get(`${AI_ENGINE_URL}/research/${researchId}/suggestions`, {
      timeout: 5000
    });
    res.json(aiRes.data);
  } catch (err) {
    // If AI engine is unreachable, return empty
    res.json({ topic_locked: false, selected_topic: null, topic_suggestions: [] });
  }
});

// Rename Research
// PATCH /research/:id/rename
router.patch('/:id/rename', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await db.query(
      "UPDATE research_logs SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title",
      [title.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Research not found" });
    }

    logger.info(`[Node] Renamed research #${id} to "${title.trim()}"`);
    res.json({ success: true, research: result.rows[0] });

  } catch (err) {
    logger.error(`[Rename] ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete Research
// DELETE /research/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // First check if research exists and belongs to user
    const checkResult = await db.query(
      "SELECT id, user_id FROM research_logs WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Research not found" });
    }

    // Optional: Check ownership if user is authenticated
    if (userId && checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this research" });
    }

    // Delete research and related data
    await db.query("DELETE FROM research_logs WHERE id = $1", [id]);

    logger.info(`[Node] Deleted research #${id}`);
    res.json({ success: true, message: "Research deleted" });

  } catch (err) {
    logger.error(`[Delete] ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});

// Share research publicly
router.post('/:id/share', auth, async (req, res) => {
  try {
    const researchId = req.params.id;
    const userId = req.user.id;

    // Verify user owns this research
    const research = await db.query(
      'SELECT * FROM research_logs WHERE id = $1 AND user_id = $2',
      [researchId, userId]
    );

    if (research.rows.length === 0) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // Generate share token
    const shareToken = uuidv4().replace(/-/g, ''); // Remove hyphens for cleaner URLs

    // Update research with share token
    await db.query(
      'UPDATE research_logs SET share_token = $1 WHERE id = $2',
      [shareToken, researchId]
    );

    const shareUrl = `${req.protocol}://${req.get('host')}/#/shared/${shareToken}`;

    res.json({
      shareToken,
      shareUrl,
      message: 'Research shared successfully'
    });
  } catch (error) {
    winston.error('Error sharing research:', error);
    res.status(500).json({ error: 'Failed to share research' });
  }
});

// Get shared research (public endpoint - no auth)
router.get('/shared/:token', async (req, res) => {
  try {
    const shareToken = req.params.token;

    // Get research by share token
    const research = await db.query(
      `SELECT r.*, u.username 
       FROM research_logs r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.share_token = $1`,
      [shareToken]
    );

    if (research.rows.length === 0) {
      return res.status(404).json({ error: 'Shared research not found' });
    }

    const researchData = research.rows[0];

    // Get execution events
    const events = await db.query(
      'SELECT * FROM execution_events WHERE research_id = $1 ORDER BY created_at ASC',
      [researchData.id]
    );

    // Get data sources
    const sources = await db.query(
      'SELECT * FROM data_sources WHERE research_id = $1',
      [researchData.id]
    );

    res.json({
      research: {
        id: researchData.id,
        topic: researchData.topic,
        status: researchData.status,
        depth: researchData.depth,
        result_json: researchData.result_json,
        report_markdown: researchData.report_markdown,
        latex_source: researchData.latex_source,
        created_at: researchData.created_at,
        updated_at: researchData.updated_at,
        username: researchData.username
      },
      events: events.rows,
      sources: sources.rows
    });
  } catch (error) {
    winston.error('Error fetching shared research:', error);
    res.status(500).json({ error: 'Failed to fetch shared research' });
  }
});

module.exports = router;
