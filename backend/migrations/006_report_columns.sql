-- ===================================
-- Add report_markdown and latex_source columns
-- to research_logs for caching generated reports
-- ===================================

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS report_markdown TEXT;

ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS latex_source TEXT;
