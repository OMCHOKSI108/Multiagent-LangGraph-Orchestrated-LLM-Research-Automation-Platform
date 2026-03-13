const adminAuth = (req, res, next) => {

    const adminKey = req.header('x-admin-key');
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'dr_admin_super_secret_108';

    if (adminKey && adminKey === expectedKey) {
        req.isAdmin = true;
        return next();
    }

    if (req.user && req.user.role === 'admin') {
        req.isAdmin = true;
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Admin access required' });
};

module.exports = adminAuth;
