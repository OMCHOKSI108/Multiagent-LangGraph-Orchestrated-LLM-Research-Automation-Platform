const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Middleware to validate external System API Keys (from api_keys table).
 * Expects key in 'x-api-key' header or body.api_key.
 * Attaches 'userId' to request object if valid.
 */
module.exports = async (req, res, next) => {
    const apiKey = req.header('x-api-key') || (req.body && req.body.api_key);
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            message: 'API Key required' 
        });
    }

    try {
        const keyCheck = await db.query(
            "SELECT id, user_id FROM api_keys WHERE key_value = $1 AND is_active = TRUE",
            [apiKey]
        );

        if (keyCheck.rows.length === 0) {
            logger.warn(`Invalid API Key attempt: ${apiKey}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or inactive API Key' 
            });
        }

        // Attach user info and key record to req for consistency with auth middleware
        req.user = { id: keyCheck.rows[0].user_id };
        req.apiKeyRecord = keyCheck.rows[0];
        
        // Auto-update usage count (optional but helpful)
        db.query("UPDATE api_keys SET usage_count = usage_count + 1 WHERE id = $1", [keyCheck.rows[0].id])
            .catch(e => logger.error(`[apiKeyAuth] Failed to update usage: ${e.message}`));

        next();
    } catch (err) {
        logger.error(`[apiKeyAuth] Error: ${err.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error during API key validation' 
        });
    }
};
