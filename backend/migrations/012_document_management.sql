-- ===================================
-- Migration 012: Document Management
-- Adds document_sections table for granular editing
-- ===================================

CREATE TABLE IF NOT EXISTS document_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id INTEGER NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
    section_title VARCHAR(500) NOT NULL,
    content_markdown TEXT NOT NULL,
    section_order INTEGER DEFAULT 0,
    section_type VARCHAR(50) DEFAULT 'general', -- 'abstract', 'introduction', 'method', 'results', 'conclusion'
    metadata JSONB DEFAULT '{}'::jsonb,
    is_locked BOOLEAN DEFAULT FALSE,
    last_edited_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_sections_session ON document_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_order ON document_sections(session_id, section_order);

-- Add updated_at trigger (Idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_doc_sections_updated_at ON document_sections;
CREATE TRIGGER trg_update_doc_sections_updated_at
BEFORE UPDATE ON document_sections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
