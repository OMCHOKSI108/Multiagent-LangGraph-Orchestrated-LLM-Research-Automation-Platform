const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Custom local pool to bypass Docker-oriented .env settings
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'research_platform',
  password: 'research_password', // Try the known password first
  port: 5432,
});

async function runMigration() {
  try {
    const migrationName = '012_document_management.sql';
    console.log(`Running migration ${migrationName} on localhost...`);
    
    const migrationPath = path.join(__dirname, `../migrations/${migrationName}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration 012 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

runMigration();
