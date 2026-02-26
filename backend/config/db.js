const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pool;

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
} else {
    const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
    const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
    if (missingEnvVars.length > 0) {
        throw new Error(`[DB] Missing required environment variables (or DATABASE_URL): ${missingEnvVars.join(', ')}`);
    }

    pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });
}

pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client', err);
    // Keep process alive; requests will continue to retry via pool.
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    pool,
};
