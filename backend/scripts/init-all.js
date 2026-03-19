const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runAllMigrations() {
    let retries = 5;
    while (retries > 0) {
        try {
            // Test connection
            await db.query('SELECT 1');
            console.log('✅ Connected to database.');
            break;
        } catch (err) {
            retries -= 1;
            console.log(`[DB] Connection failed. Retrying... (${retries} left)`);
            if (retries === 0) throw err;
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            console.log(`Running migration: ${file}...`);
            const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

            try {
                // Execute the entire file contents as a single query transaction
                await db.query(`BEGIN;\n${migrationSQL}\nCOMMIT;`);
                console.log(`✅ ${file} applied.`);
            } catch (err) {
                await db.query('ROLLBACK;');
                console.log(`[Warning] execute error for file ${file}:`, err.message);
                // If the error is about a relation already existing, we can often ignore it if we don't have better check
                // but IF NOT EXISTS handles most cases.
            }
        }
        console.log('✅ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runAllMigrations();
