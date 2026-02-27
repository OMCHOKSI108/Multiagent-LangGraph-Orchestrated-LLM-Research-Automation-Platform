const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runAllMigrations() {
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
                throw err;
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
