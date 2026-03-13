const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

let poolConfig;
if (process.env.DATABASE_URL) {
    let connStr = process.env.DATABASE_URL;
    if (connStr.includes('sslmode=')) {
        connStr = connStr.split('?')[0];
    }
    poolConfig = {
        connectionString: connStr,
        ssl: { rejectUnauthorized: false }
    };
} else {
    poolConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };
}

const pool = new Pool(poolConfig);

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('--- Running Migration 011 ---');
        
        // 1. Add role column
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'");
        console.log('✓ Added role column');

        // 2. Hash password and seed/update admin user
        const email = 'omchoksi99@gmail.com';
        const rawPassword = 'OMchoksi@108';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(rawPassword, salt);

        const checkRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (checkRes.rows.length > 0) {
            await client.query(
                "UPDATE users SET password_hash = $1, role = 'admin', is_active = TRUE WHERE email = $2",
                [hash, email]
            );
            console.log(`✓ Updated existing user ${email} to admin`);
        } else {
            await client.query(
                "INSERT INTO users (username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, TRUE)",
                ['Om Choksi Admin', email, hash, 'admin']
            );
            console.log(`✓ Created new admin user ${email}`);
        }

        console.log('--- Migration 011 Completed ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
