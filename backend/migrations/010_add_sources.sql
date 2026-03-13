-- Migration 010: Add sources table for MARP scraped data persistence
-- Run: node backend/scripts/run-migration.js

CREATE TABLE IF NOT EXISTS sources (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER REFERENCES research_sessions(id) ON DELETE CASCADE,
    workspace_id    UUID,
    url             TEXT NOT NULL,
    title           TEXT DEFAULT '',
    content         TEXT DEFAULT '',
    authors         JSONB DEFAULT '[]',
    published_date  TEXT DEFAULT '',
    source_type     TEXT DEFAULT 'web',     -- web | academic | pdf | table | news | search
    strategy        TEXT DEFAULT 'article', -- which scraper strategy was used
    metadata        JSONB DEFAULT '{}',
    word_count      INTEGER DEFAULT 0,
    content_hash    TEXT DEFAULT '',
    scraped_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_session_id  ON sources(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_workspace_id ON sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sources_scraped_at   ON sources(scraped_at DESC);

-- Also add ieee_paper column to research_sessions if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='research_sessions' AND column_name='ieee_paper'
    ) THEN
        ALTER TABLE research_sessions ADD COLUMN ieee_paper TEXT;
    END IF;
END $$;
