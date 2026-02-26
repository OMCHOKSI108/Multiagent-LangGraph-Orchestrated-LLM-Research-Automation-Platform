-- ===================================
-- Migration 008: Allow events/sources for both research_logs AND research_sessions
-- Drops FK constraints so research_id can reference either table.
-- ===================================

-- Drop FK on execution_events.research_id (was → research_logs only)
ALTER TABLE execution_events DROP CONSTRAINT IF EXISTS execution_events_research_id_fkey;

-- Drop FK on data_sources.research_id (was → research_logs only)
ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS data_sources_research_id_fkey;

-- Also fix workspace_uploads.file_path NOT NULL issue
ALTER TABLE workspace_uploads ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE workspace_uploads ALTER COLUMN file_path SET DEFAULT '';
