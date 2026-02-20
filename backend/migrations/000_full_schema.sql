-- ===================================
-- Deep Research Engine Database Schema
-- Run this in your PostgreSQL database
-- ===================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT 'Default Key',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Research Logs Table (Main Jobs Table)
CREATE TABLE IF NOT EXISTS research_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    task TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'queued',
    result_json JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- Indexes for Performance
-- ===================================

-- Fast lookup for research jobs
CREATE INDEX IF NOT EXISTS idx_research_logs_status 
ON research_logs(status);

CREATE INDEX IF NOT EXISTS idx_research_logs_user 
ON research_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_research_logs_status_created 
ON research_logs(status, created_at);

-- Index for stale job recovery
CREATE INDEX IF NOT EXISTS idx_research_logs_processing_updated 
ON research_logs(status, updated_at) 
WHERE status = 'processing';

-- API key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_value 
ON api_keys(key_value);

-- Chat history by session
CREATE INDEX IF NOT EXISTS idx_chat_history_session 
ON chat_history(session_id);

-- Run migrations in order: 000, 001, 002, 003, 004, 005
