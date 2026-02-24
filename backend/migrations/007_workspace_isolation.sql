-- ===================================
-- Migration 007: Workspace Isolation & Research Sessions
-- Adds workspace concept, replaces research_logs with research_sessions
-- ===================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================
-- 1. Workspaces Table
-- ===================================
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',  -- active | archived
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(user_id, status);

-- ===================================
-- 2. Research Sessions Table (new — replaces research_logs for new flow)
-- ===================================
CREATE TABLE IF NOT EXISTS research_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    refined_topic TEXT,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    trigger_source VARCHAR(20) DEFAULT 'user', -- 'user' | 'retry'
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

CREATE INDEX IF NOT EXISTS idx_rs_workspace ON research_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rs_user ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rs_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_rs_status_created ON research_sessions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_rs_processing_updated
    ON research_sessions(status, updated_at)
    WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_rs_share_token ON research_sessions(share_token)
    WHERE share_token IS NOT NULL;

-- ===================================
-- 3. Workspace Uploads Table
-- ===================================
CREATE TABLE IF NOT EXISTS workspace_uploads (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    embedding_status VARCHAR(20) DEFAULT 'pending', -- pending | processing | done | failed
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_workspace ON workspace_uploads(workspace_id);

-- ===================================
-- 4. Embeddings Metadata Table
-- ===================================
CREATE TABLE IF NOT EXISTS embeddings_meta (
    id SERIAL PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL,
    source_type VARCHAR(50),    -- 'scraped' | 'uploaded' | 'generated'
    source_url TEXT,
    chunk_index INTEGER,
    vector_id VARCHAR(255),
    content_preview TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embed_workspace ON embeddings_meta(workspace_id);
CREATE INDEX IF NOT EXISTS idx_embed_session ON embeddings_meta(session_id);

-- ===================================
-- 5. Add workspace_id to existing tables
-- ===================================

-- chat_history: add workspace scope
ALTER TABLE chat_history
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE chat_history
    ADD COLUMN IF NOT EXISTS research_session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_workspace ON chat_history(workspace_id);

-- data_sources: add workspace scope
ALTER TABLE data_sources
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sources_workspace ON data_sources(workspace_id);

-- user_memories: add workspace scope
ALTER TABLE user_memories
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- execution_events: add workspace link (via session)
-- Note: execution_events.research_id still references research_logs for backward compat.
-- New events will also store session_id for the new flow.
ALTER TABLE execution_events
    ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES research_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_session ON execution_events(session_id, created_at);

-- ===================================
-- 6. Create default workspace for existing users (data migration)
-- ===================================
-- For each user who has research_logs but no workspace, create a "Default Workspace"
INSERT INTO workspaces (user_id, name, description)
SELECT DISTINCT u.id, 'Default Workspace', 'Auto-created workspace for existing research'
FROM users u
WHERE u.id IN (SELECT DISTINCT user_id FROM research_logs)
  AND u.id NOT IN (SELECT DISTINCT user_id FROM workspaces)
ON CONFLICT DO NOTHING;

-- ===================================
-- 7. Update PG LISTEN/NOTIFY trigger to include research_sessions
-- ===================================
CREATE OR REPLACE FUNCTION notify_new_research_job() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_research_job', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_new_research_job'
    ) THEN
        CREATE TRIGGER trg_new_research_job
        AFTER INSERT OR UPDATE OF status ON research_sessions
        FOR EACH ROW
        WHEN (NEW.status = 'queued')
        EXECUTE FUNCTION notify_new_research_job();
    END IF;
END $$;
