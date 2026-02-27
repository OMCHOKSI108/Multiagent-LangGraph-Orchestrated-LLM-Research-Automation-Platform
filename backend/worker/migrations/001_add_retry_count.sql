-- Migration: Add retry_count column for job retry tracking
-- Run this against your PostgreSQL database

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Index for faster queue queries
CREATE INDEX IF NOT EXISTS idx_research_logs_status_created 
ON research_logs(status, created_at);

-- Index for stale job recovery
CREATE INDEX IF NOT EXISTS idx_research_logs_processing_updated 
ON research_logs(status, updated_at) 
WHERE status = 'processing';
