// Vercel-compatible backend
// Remove WebSocket and long-running features

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load env vars
dotenv.config();

const app = express();

// Vercel-specific configuration
const isVercel = process.env.VERCEL === '1';

// Global limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isVercel ? 300 : 800,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth-specific limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isVercel ? 40 : 100,
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors({
    origin: isVercel ? true : (origin, callback) => {
        const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
            .split(',')
            .map(origin => origin.trim())
            .filter(Boolean);
        
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    }
}));

app.use(globalLimiter);
app.use(express.json({ limit: '5mb' })); // Reduced for serverless
app.use('/auth/login', authLimiter);
app.use('/auth/signup', authLimiter);

// Routes (remove WebSocket and worker routes)
const auth = require('./middleware/auth');
app.use('/auth', require('./routes/auth.routes'));
app.use('/user', require('./routes/user.routes'));
app.use('/research', require('./routes/research.routes'));
app.use('/chat', require('./routes/chat.routes'));

app.use('/agents', require('./routes/agents.routes'));
app.use('/memories', auth, require('./routes/memory.routes'));
app.use('/export', auth, require('./routes/export.routes'));
app.use('/usage', auth, require('./routes/usage.routes'));

// Static files (if needed)
app.use('/generated_images', express.static('generated_images'));

// Health endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "backend",
        platform: isVercel ? "vercel-serverless" : "traditional"
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: "AI Research Engine Backend (Node.js)",
        status: "active",
        platform: isVercel ? "vercel-serverless" : "traditional",
        ai_engine_url: process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack || err);
    
    if (process.env.NODE_ENV === 'development') {
        res.status(500).json({ error: 'Something went wrong!', details: err.message });
    } else {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Export for Vercel
module.exports = app;

// Only start server if not on Vercel
if (!isVercel) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`[Node] Server running on port ${PORT}`);
        console.log(`[Node] Connected to AI Engine at ${process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"}`);
    });
}
