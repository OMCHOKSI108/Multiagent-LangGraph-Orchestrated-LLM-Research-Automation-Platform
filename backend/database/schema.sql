-- ===================================
-- Deep Research Engine – Full Database Schema
-- Consolidated from migrations 000–004
-- Run this for a FRESH PostgreSQL database
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
    current_stage VARCHAR(50) DEFAULT 'queued',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
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

-- 5. Execution Events Table (Live Activity Streaming)
CREATE TABLE IF NOT EXISTS execution_events (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    stage VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    category VARCHAR(50) DEFAULT 'stage',
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Data Sources Table (Sources Scraped per Research)
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    items_found INTEGER DEFAULT 0,
    title VARCHAR(500),
    description TEXT,
    favicon VARCHAR(500),
    thumbnail VARCHAR(500),
    published_date VARCHAR(50),
    citation_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. User Memories Table
CREATE TABLE IF NOT EXISTS user_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    source_id INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- Indexes for Performance
-- ===================================

-- Research logs
CREATE INDEX IF NOT EXISTS idx_research_logs_status
ON research_logs(status);

CREATE INDEX IF NOT EXISTS idx_research_logs_user
ON research_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_research_logs_status_created
ON research_logs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_research_logs_processing_updated
ON research_logs(status, updated_at)
WHERE status = 'processing';

-- API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_value
ON api_keys(key_value);

-- Chat history
CREATE INDEX IF NOT EXISTS idx_chat_history_session
ON chat_history(session_id);

-- Execution events
CREATE INDEX IF NOT EXISTS idx_events_research_id
ON execution_events(research_id, created_at);

-- Data sources
CREATE INDEX IF NOT EXISTS idx_sources_research
ON data_sources(research_id);

-- User memories
CREATE INDEX IF NOT EXISTS idx_memories_user
ON user_memories(user_id);

CREATE INDEX IF NOT EXISTS idx_memories_source
ON user_memories(user_id, source);

CREATE INDEX IF NOT EXISTS idx_memories_content
ON user_memories USING gin(to_tsvector('english', content));
