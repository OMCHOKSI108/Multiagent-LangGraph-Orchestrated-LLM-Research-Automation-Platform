const adminAuth = (req, res, next) => {
    // The admin frontend will send an x-admin-key header
    // Or we could rely on a specific admin JWT, but for this standalone
    // implementation based on the prompt, checking a fixed key or just doing a basic
    // validation is standard.

    // As per the spec, the user wants a hardcoded admin login on the frontend:
    // Email: omchoksiadmin@gmail.com
    // Password: OMchoksi@108

    // We can define an ADMIN_KEY in the backend for security, or for this specific
    // internal dashboard, check if they provide the specific email via a custom header.
    // The spec mentioned: "with a middleware that checks x-admin-key header or a separate admin JWT."

    const adminKey = req.header('x-admin-key');
    const expectedKey = process.env.ADMIN_SECRET_KEY || 'dr_admin_super_secret_108';

    if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin key' });
    }

    // Attach admin flag to request
    req.isAdmin = true;
    next();
};

module.exports = adminAuth;
