const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// Global limiter (lenient in development to avoid blocking local UX)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 2000 : 500,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter only for auth mutation endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 200 : 25,
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients or same-origin requests without Origin header.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(globalLimiter);
app.use(express.json({ limit: '10mb' })); // Limit body size
app.use('/generated_images', express.static('generated_images'));
app.use('/research_images', express.static(require('path').join(__dirname, '..', 'frontend', 'public', 'research_images')));
app.use('/auth/login', authLimiter);
app.use('/auth/signup', authLimiter);

// Routes
const auth = require('./middleware/auth');
app.use('/auth', require('./routes/auth.routes'));
app.use('/user', require('./routes/user.routes'));
app.use('/workspaces', require('./routes/workspace.routes'));
app.use('/research', require('./routes/research.routes'));
app.use('/chat', require('./routes/chat.routes'));
app.use('/events', require('./routes/events.routes'));
app.use('/agents', require('./routes/agents.routes'));
app.use('/memories', auth, require('./routes/memory.routes'));
app.use('/export', auth, require('./routes/export.routes'));
app.use('/usage', auth, require('./routes/usage.routes'));

// Initialize Redis client if REDIS_URL is provided
if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().then(() => {
        console.log('[Node] Connected to Redis');
        app.locals.redis = redisClient;
    }).catch(err => {
        console.error('[Node] Failed to connect to Redis', err);
    });
}

// Health Check
app.get('/', (req, res) => {
    res.json({
        service: "AI Research Engine Backend (Node.js)",
        status: "active",
        ai_engine_url: process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
    });
});

// Dedicated Health Endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "backend"
    });
});

// Error Handler
app.use((err, req, res, next) => {
    // Log full error server-side
    console.error(err.stack || err);

    // Avoid leaking internal error details in production responses
    if (process.env.NODE_ENV === 'development') {
        res.status(500).json({ error: 'Something went wrong!', details: err.message });
    } else {
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

app.listen(PORT, () => {
    console.log(`[Node] Server running on port ${PORT}`);
    console.log(`[Node] Connected to AI Engine at ${process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"}`);
});
