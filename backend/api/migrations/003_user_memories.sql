-- User Memories Table
-- Stores context/notes that inform future research and chat sessions.
-- Inspired by opensearch-ai's Supermemory integration, adapted to PostgreSQL.

CREATE TABLE IF NOT EXISTS user_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',        -- 'manual', 'search', 'research', 'chat'
    source_id INTEGER,                          -- optional FK to research_logs.id
    metadata JSONB DEFAULT '{}',                -- flexible: tags, embeddings, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON user_memories(user_id, source);
CREATE INDEX IF NOT EXISTS idx_memories_content ON user_memories USING gin(to_tsvector('english', content));
