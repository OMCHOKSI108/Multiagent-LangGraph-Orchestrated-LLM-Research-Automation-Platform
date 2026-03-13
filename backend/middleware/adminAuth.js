const adminAuth = (req, res, next) => {
    // 1. Check for specific admin header (x-admin-key)
    const adminKey = req.header('x-admin-key');
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'dr_admin_super_secret_108';

    if (adminKey && adminKey === expectedKey) {
        req.isAdmin = true;
        return next();
    }

    // 2. Check for Role-Based Access via JWT (req.user is set by auth middleware)
    if (req.user && req.user.role === 'admin') {
        req.isAdmin = true;
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Admin access required' });
};

module.exports = adminAuth;
