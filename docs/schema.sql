-- ===================================
-- Paperguide Backend Database Schema
-- Consolidated from migrations 000–008
-- ===================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================
-- 1. Users Table
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 2. API Keys Table
-- ===================================
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) DEFAULT 'Default Key',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 3. Research Logs Table (Legacy)
-- ===================================
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

-- ===================================
-- 4. Workspaces Table
-- ===================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================
-- 5. Research Sessions Table (Workspace-Aware)
-- ===================================
CREATE TABLE IF NOT EXISTS research_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    refined_topic TEXT,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    trigger_source VARCHAR(20) DEFAULT 'user',
    depth VARCHAR(20) DEFAULT 'deep',
    result_json JSONB,
    report_markdown TEXT,
    latex_source TEXT,
    retry_count INTEGER DEFAULT 0,
    current_stage VARCHAR(50) DEFAULT 'queued',
    share_token VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================
-- 6. Workspace Uploads Table
-- ===================================
CREATE TABLE IF NOT EXISTS workspace_uploads (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    embedding_status VARCHAR(20) DEFAULT 'pending',
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================
-- 7. Data Sources Table
-- ===================================
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
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

-- ===================================
-- 8. Chat History Table
-- ===================================
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    research_session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 9. Execution Events Table (Live Activity Streaming)
-- ===================================
CREATE TABLE IF NOT EXISTS execution_events (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    stage VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    category VARCHAR(50) DEFAULT 'stage',
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 10. User Memories Table
-- ===================================
CREATE TABLE IF NOT EXISTS user_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    source_id INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 11. Embeddings Metadata Table
-- ===================================
CREATE TABLE IF NOT EXISTS embeddings_meta (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    source_type VARCHAR(50),
    source_url TEXT,
    chunk_index INTEGER,
    vector_id VARCHAR(255),
    content_preview TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================
-- 12. Add workspace_id to existing tables (Migration 007)
-- ===================================

-- chat_history: add workspace scope
ALTER TABLE chat_history
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE chat_history
    ADD COLUMN IF NOT EXISTS research_session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL;

-- data_sources: add workspace scope
ALTER TABLE data_sources
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- user_memories: add workspace scope
ALTER TABLE user_memories
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- execution_events: add workspace link (via session)
ALTER TABLE execution_events
    ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL;

-- ===================================
-- 13. Indexes for Performance
-- ===================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated ON workspaces(updated_at DESC);

-- Research Sessions
CREATE INDEX IF NOT EXISTS idx_rs_workspace ON research_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rs_user ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rs_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_rs_status_created ON research_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rs_processing_updated
    ON research_sessions(status, updated_at)
    WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_rs_share_token ON research_sessions(share_token)
    WHERE share_token IS NOT NULL;

-- Workspace Uploads
CREATE INDEX IF NOT EXISTS idx_uploads_workspace ON workspace_uploads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON workspace_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON workspace_uploads(embedding_status);

-- Data Sources
CREATE INDEX IF NOT EXISTS idx_sources_research ON data_sources(research_id);
CREATE INDEX IF NOT EXISTS idx_sources_workspace ON data_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_domain ON data_sources(domain);
CREATE INDEX IF NOT EXISTS idx_sources_created ON data_sources(created_at DESC);

-- Chat History
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_workspace ON chat_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_user ON chat_history(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_history(created_at DESC);

-- Execution Events
CREATE INDEX IF NOT EXISTS idx_events_research ON execution_events(research_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON execution_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_stage ON execution_events(stage);
CREATE INDEX IF NOT EXISTS idx_events_created ON execution_events(created_at DESC);

-- User Memories
CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_workspace ON user_memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON user_memories(user_id, source);
CREATE INDEX IF NOT EXISTS idx_memories_content
    ON user_memories USING gin(to_tsvector('english', content));

-- Embeddings Metadata
CREATE INDEX IF NOT EXISTS idx_embed_workspace ON embeddings_meta(workspace_id);
CREATE INDEX IF NOT EXISTS idx_embed_session ON embeddings_meta(session_id);
CREATE INDEX IF NOT EXISTS idx_embed_source_type ON embeddings_meta(source_type);
CREATE INDEX IF NOT EXISTS idx_embed_created ON embeddings_meta(created_at DESC);

-- ===================================
-- 14. Full-Text Search
-- ===================================
CREATE INDEX IF NOT EXISTS idx_memories_content_fts
    ON user_memories USING gin(to_tsvector('english', content));

-- ===================================
-- 15. Migration: Default Workspace Creation (Migration 007)
-- ===================================
-- For each user who has research_logs but no workspace, create a "Default Workspace"
INSERT INTO workspaces (user_id, name, description)
SELECT DISTINCT u.id, 'Default Workspace', 'Auto-created workspace for existing research'
FROM users u
WHERE u.id IN (SELECT DISTINCT user_id FROM research_logs)
  AND u.id NOT IN (SELECT DISTINCT user_id FROM workspaces)
ON CONFLICT DO NOTHING;

-- ===================================
-- 16. PG LISTEN/NOTIFY Trigger for Research Sessions (Migration 007)
-- ===================================
CREATE OR REPLACE FUNCTION notify_new_research_job() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_research_job', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_research_job'
    ) THEN
        CREATE TRIGGER trg_new_research_job
        AFTER INSERT OR UPDATE OF status ON research_sessions
        FOR EACH ROW
        WHEN (NEW.status = 'queued')
        EXECUTE FUNCTION notify_new_research_job();
    END IF;
END;
$$;
