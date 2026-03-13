-- 011_add_user_role_and_seed_admin.sql
-- Add role-based access control and seed the requested admin account.

-- 1. Add role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- 2. Seed the requested admin account
-- Email: omchoksi99@gmail.com
-- Password: OMchoksi@108
-- We'll use a placeholder for the password_hash and then update it via a script to ensure it's correctly hashed using bcrypt.
INSERT INTO users (username, email, password_hash, role)
VALUES ('Om Choksi Admin', 'omchoksi99@gmail.com', 'TEMP_HASH', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
