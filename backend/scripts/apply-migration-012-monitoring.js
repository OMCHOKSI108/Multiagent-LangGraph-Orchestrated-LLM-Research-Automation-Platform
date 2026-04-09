const path = require('path');
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
        console.log('--- Running Migration 012: Add Monitoring Tables ---');

        // Read and execute the migration SQL
        const fs = require('fs');
        const migrationPath = path.join(__dirname, '..', 'migrations', '012_add_monitoring_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.trim().substring(0, 50) + '...');
                await client.query(statement);
            }
        }

        console.log('✓ Migration 012 completed successfully');
        console.log('✓ Monitoring tables created');
        console.log('✓ API key encryption support added');
        console.log('✓ Alert system tables created');

    } catch (err) {
        console.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
});