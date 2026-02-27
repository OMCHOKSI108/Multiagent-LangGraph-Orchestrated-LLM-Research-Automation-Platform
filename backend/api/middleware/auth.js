const jwt = require('jsonwebtoken');

/**
 * Authentication middleware
 * - Accepts JWT via `x-auth-token` or `Authorization: Bearer ...`
 * - Also supports short-lived SSE tokens passed via `?token=` which are
 *   created by the `/events/token/:research_id` endpoint and stored
 *   temporarily in `global.SSE_TOKENS`.
 */
module.exports = async function (req, res, next) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Support both x-auth-token and Authorization: Bearer headers
    let token = req.header('x-auth-token');

    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }


    // Allow short-lived SSE tokens passed as `token` query param
    const oneTimeToken = req.query && req.query.token;
    if (oneTimeToken) {
        // if Redis is configured, verify against Redis; otherwise fall back to in-memory map
        if (process.env.REDIS_URL && req.app.locals.redis) {
            const redis = req.app.locals.redis;
            const key = `sse_token:${oneTimeToken}`;
            const exists = await redis.get(key);
            if (exists) {
                await redis.del(key);
                return next();
            }
        } else if (global.SSE_TOKENS instanceof Map) {
            const tokenData = global.SSE_TOKENS.get(oneTimeToken);
            if (tokenData && tokenData.expiresAt > Date.now()) {
                global.SSE_TOKENS.delete(oneTimeToken);
                req.user = { id: tokenData.userId, username: tokenData.username };
                return next();
            }
            global.SSE_TOKENS.delete(oneTimeToken);
        }
    }

    // EventSource cannot set custom headers; allow JWT via query token as fallback.
    if (!token && oneTimeToken) {
        token = oneTimeToken;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
