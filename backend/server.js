const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({
    path: process.env.ROOT_ENV_PATH || path.resolve(__dirname, '..', '.env')
});

const app = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// Prefer CORS_ORIGINS (comma-separated), fall back to CORS_ORIGIN
const corsEnv =
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    'http://localhost:3000,http://127.0.0.1:3000';

const allowedOrigins = corsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// Trust the first proxy (Railway/Vercel) so rate-limiting gets the real client IP
app.set('trust proxy', 1);

function shouldSkipGlobalRateLimit(req) {
    // AI engine emits a high volume of internal events during long research runs.
    // Limiting these writes can starve user-facing APIs and produce false 429s.
    const p = req.path || '';
    if (req.method === 'POST' && (p === '/api/events' || p === '/api/events/source')) return true;
    if (p === '/api/health' || p === '/') return true;
    return false;
}

// Global limiter (lenient in development to avoid blocking local UX)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 5000 : 2000,
    skip: shouldSkipGlobalRateLimit,
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

// Initialize Passport Strategies
const passport = require('passport');
require('./config/passport');
app.use(passport.initialize());

app.use('/generated_images', express.static('generated_images'));
app.use('/research_images', express.static(process.env.RESEARCH_IMAGES_DIR || '/shared/research_images'));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Routes
const auth = require('./middleware/auth');
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/workspaces', require('./routes/workspace.routes'));
app.use('/api/research', require('./routes/research.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/agents', require('./routes/agents.routes'));
app.use('/api/memories', auth, require('./routes/memory.routes'));
app.use('/api/export', auth, require('./routes/export.routes'));
app.use('/api/usage', auth, require('./routes/usage.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/sources', require('./routes/sources.routes'));

// Initialize Redis client if REDIS_URL is provided
if (process.env.REDIS_URL) {
    const { createClient } = require('redis');
    const redisUrl = process.env.REDIS_URL;
    
    // Auto-detect TLS for Upstash or rediss:// protocol
    const useTls = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');
    
    const redisClient = createClient({ 
        url: redisUrl,
        socket: useTls ? { tls: true, rejectUnauthorized: false } : {}
    });
    
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    redisClient.connect().then(() => {
        console.log('[Node] Connected to Redis' + (useTls ? ' (TLS enabled)' : ''));
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
app.get('/api/health', (req, res) => {
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
