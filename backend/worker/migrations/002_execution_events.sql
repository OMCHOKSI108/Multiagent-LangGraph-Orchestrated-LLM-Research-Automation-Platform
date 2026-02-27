-- ===================================
-- Execution Events Table
-- For live activity streaming
-- ===================================

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

-- Index for fast event retrieval by research
CREATE INDEX IF NOT EXISTS idx_events_research_id 
ON execution_events(research_id, created_at);

-- ===================================
-- Add columns to research_logs
-- ===================================

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'queued';

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- ===================================
-- Data Sources Table
-- Track sources scraped per research
-- ===================================

CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    research_id INTEGER REFERENCES research_logs(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    items_found INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_research 
ON data_sources(research_id);
