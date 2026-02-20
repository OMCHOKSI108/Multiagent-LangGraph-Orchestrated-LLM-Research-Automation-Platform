const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function getJwtSecretOrThrow(res) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        res.status(500).json({ error: "Authentication service unavailable" });
        return null;
    }
    return jwtSecret;
}

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields required" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert User
        const result = await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, hash]
        );

        res.status(201).json({ message: "User created", user: result.rows[0] });

    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Username or Email already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const jwtSecret = getJwtSecretOrThrow(res);
        if (!jwtSecret) return;

        const { email, password } = req.body;

        // Find User
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];

        // Check Password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get current user from JWT token
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, username, email FROM users WHERE id = $1",
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Update current user profile
// PATCH /auth/me
router.patch('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const { username } = req.body;
        const trimmedUsername = typeof username === 'string' ? username.trim() : '';

        if (!trimmedUsername) {
            return res.status(400).json({ error: "Name is required" });
        }

        if (trimmedUsername.length < 2 || trimmedUsername.length > 100) {
            return res.status(400).json({ error: "Name must be between 2 and 100 characters" });
        }

        const result = await db.query(
            "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email",
            [trimmedUsername, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Change Password
// POST /auth/password
router.post('/password', require('../middleware/auth'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        // Get current user
        const userResult = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!valid) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);

        res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
