-- 009_oauth_support.sql
-- Add OAuth support to the users table

-- 1. Make password optional
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add OAuth ID and provider tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Add index for fast OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(provider, provider_id);
