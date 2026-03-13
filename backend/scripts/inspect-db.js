const db = require('../config/db');

async function inspect() {
  try {
    const res = await db.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'api_keys', 'research_logs')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
