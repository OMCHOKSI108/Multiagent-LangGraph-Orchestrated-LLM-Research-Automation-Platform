const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Middleware to validate research API keys (session-based).
 * Expects key in 'x-api-key' header.
 * Attaches 'research_id' to request object if valid.
 */
module.exports = async (req, res, next) => {
    const apiKey = req.header('x-api-key');
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            message: 'No session-level API key provided' 
        });
    }

    try {
        // Query both research_sessions (primary) and research_logs (fallback)
        const sessionResult = await db.query(
            'SELECT id FROM research_sessions WHERE api_key = $1 AND archived = false',
            [apiKey]
        );

        if (sessionResult.rows.length > 0) {
            req.research_id = sessionResult.rows[0].id;
            req.research_type = 'session';
            return next();
        }

        const logResult = await db.query(
            'SELECT id FROM research_logs WHERE api_key = $1',
            [apiKey]
        );

        if (logResult.rows.length > 0) {
            req.research_id = logResult.rows[0].id;
            req.research_type = 'log';
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired session API key' 
        });
    } catch (err) {
        logger.error(`[sessionKeyAuth] Error: ${err.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error during session key validation' 
        });
    }
};
