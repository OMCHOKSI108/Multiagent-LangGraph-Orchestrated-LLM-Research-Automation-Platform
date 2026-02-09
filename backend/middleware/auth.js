const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Support both x-auth-token and Authorization: Bearer headers
    let token = req.header('x-auth-token');

    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // Support query param for SSE (EventSource doesn't support headers)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
