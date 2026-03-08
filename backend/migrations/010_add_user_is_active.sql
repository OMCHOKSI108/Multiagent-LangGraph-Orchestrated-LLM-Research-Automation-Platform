-- 010_add_user_is_active.sql
-- Replace the fragile email-prefix disable mechanism with a proper is_active flag.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrate any accounts that were previously disabled via the email prefix hack.
UPDATE users SET is_active = FALSE WHERE email LIKE 'disabled\_%' ESCAPE '\';
UPDATE users SET email = SUBSTR(email, 10) WHERE email LIKE 'disabled\_%' ESCAPE '\';
