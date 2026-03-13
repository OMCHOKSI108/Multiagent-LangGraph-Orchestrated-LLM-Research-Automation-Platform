const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function fixSchemaConflicts(db) {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    if (res.rowCount > 0) {
      const idType = res.rows[0].data_type;
      // If id is not an integer type (it's character varying in the user's DB)
      if (!idType.includes('int') && !idType.includes('serial')) {
        const backupName = `old_users_backup_${Date.now()}`;
        console.warn(`[Conflict] Existing 'users' table has incompatible ID type (${idType}).`);
        console.warn(`[Fix] Renaming existing 'users' table to '${backupName}'...`);
        
        // Rename related tables if they exist to prevent FK errors during renaming
        const tablesToRename = ['users', 'api_keys', 'research_logs', 'chat_history'];
        for (const t of tablesToRename) {
           try {
             await db.query(`ALTER TABLE ${t} RENAME TO ${t}_backup_${Date.now()}`);
             console.log(`   - Renamed ${t}`);
           } catch(e) { /* ignore if doesn't exist */ }
        }
      }
    }
  } catch (err) {
    console.error('[Schema Check Error]', err);
  }
}

async function initDatabase() {
  try {
    await fixSchemaConflicts(db);
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migrations. Starting execution...`);

    for (const file of files) {
      console.log(`\n--- Running Migration: ${file} ---`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const statements = [];
      let currentStatement = '';
      let inBlock = false;

      const lines = sql.split('\n');
      for (const line of lines) {
         const trimmed = line.trim();
         if (trimmed.startsWith('--') || !trimmed) continue;

         // Toggle block state on any dollar-quote occurrence
         // (Accounts for both starting AS $$ and ending $$;)
         const dollarCount = (line.match(/\$\$/g) || []).length;
         if (dollarCount % 2 !== 0) {
            inBlock = !inBlock;
         }
         
         currentStatement += line + '\n';

         if (!inBlock && trimmed.endsWith(';')) {
            statements.push(currentStatement.trim());
            currentStatement = '';
         }
      }
      if (currentStatement.trim()) statements.push(currentStatement.trim());

      for (let statement of statements) {
        if (!statement) continue;
        try {
          await db.query(statement);
        } catch (err) {
          // Skip "already exists" errors
          if (err.code === '42P07' || err.code === '42701' || err.code === '42P01' && statement.includes('IF EXISTS')) {
             console.log(`   [Info] Skipped: ${err.message.split('\n')[0]}`);
          } else {
            console.error(`   [Error] Executing: ${statement.substring(0, 50)}...`);
            throw err;
          }
        }
      }
      console.log(`✅ ${file} completed.`);
    }

    console.log('\n🚀 All migrations applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
