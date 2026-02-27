require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function check() {
  const r1 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='data_sources' ORDER BY ordinal_position");
  console.log('data_sources:', r1.rows.map(x => x.column_name).join(', '));
  
  const r2 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='research_logs' ORDER BY ordinal_position");
  console.log('research_logs:', r2.rows.map(x => x.column_name).join(', '));
  
  await p.end();
}
check().catch(e => { console.error(e.message); p.end(); });
