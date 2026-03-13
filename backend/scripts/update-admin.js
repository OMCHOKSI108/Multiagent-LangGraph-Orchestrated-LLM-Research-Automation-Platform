
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

const email = 'omchoksi99@gmail.com';
const password = 'OMchoksi@108';

async function updateAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    try {
        await client.connect();
        const hash = await bcrypt.hash(password, 10);
        
        const res = await client.query(
            'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3 RETURNING id',
            [hash, 'admin', email]
        );
        
        if (res.rows.length === 0) {
            console.log("Admin user not found. Creating...");
            await client.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                ['Om Choksi Admin', email, hash, 'admin']
            );
            console.log("Admin user created.");
        } else {
            console.log("Admin password updated.");
        }
    } catch (err) {
        console.error("Error updating admin:", err);
    } finally {
        await client.end();
    }
}

updateAdmin();
