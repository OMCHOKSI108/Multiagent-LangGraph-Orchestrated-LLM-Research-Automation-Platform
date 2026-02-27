-- Migration: Add share_token column to researches table
-- This allows generating public shareable links for research
-- File: 005_share_token.sql

-- Add share_token column to research_logs table
ALTER TABLE research_logs 
ADD COLUMN IF NOT EXISTS share_token VARCHAR(64);

-- Add index for faster lookups by share token
CREATE INDEX IF NOT EXISTS idx_research_logs_share_token 
ON research_logs (share_token) 
WHERE share_token IS NOT NULL;

-- Optional: Add created_at for share tracking (when share was first created)
ALTER TABLE research_logs 
ADD COLUMN shared_at TIMESTAMP;