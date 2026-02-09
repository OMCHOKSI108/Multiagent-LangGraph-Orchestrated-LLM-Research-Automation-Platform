const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter - 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' })); // Limit body size
app.use('/generated_images', express.static('generated_images'));

// Routes
const auth = require('./middleware/auth');
app.use('/auth', require('./routes/auth.routes'));
app.use('/user', require('./routes/user.routes'));
app.use('/research', require('./routes/research.routes'));
app.use('/chat', require('./routes/chat.routes'));
app.use('/events', require('./routes/events.routes'));
app.use('/agents', require('./routes/agents.routes'));
app.use('/memories', auth, require('./routes/memory.routes'));
app.use('/export', auth, require('./routes/export.routes'));
app.use('/usage', auth, require('./routes/usage.routes'));

// Health Check
app.get('/', (req, res) => {
    res.json({
        service: "AI Research Engine Backend (Node.js)",
        status: "active",
        ai_engine_url: process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

app.listen(PORT, () => {
    console.log(`[Node] Server running on port ${PORT}`);
    console.log(`[Node] Connected to AI Engine at ${process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"}`);
});
