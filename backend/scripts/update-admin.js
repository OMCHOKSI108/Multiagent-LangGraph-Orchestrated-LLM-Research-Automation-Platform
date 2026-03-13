
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const admins = [
    { email: 'devang@gmail.com', password: 'devang@123', username: 'Devang Admin' },
    { email: 'omchoksi99@gmail.com', password: 'OMchoksi@108', username: 'Om Choksi Admin' }
];

async function seedAdmins() {
    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
    };
    const client = new Client(config);

    try {
        await client.connect();
        for (const admin of admins) {
            const hash = await bcrypt.hash(admin.password, 10);
            const res = await client.query(
                'UPDATE users SET password_hash = $1, role = $2, is_active = TRUE WHERE email = $3 RETURNING id',
                [hash, 'admin', admin.email]
            );
            
            if (res.rows.length === 0) {
                await client.query(
                    'INSERT INTO users (username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, TRUE)',
                    [admin.username, admin.email, hash, 'admin']
                );
                console.log(`Admin user created: ${admin.email}`);
            } else {
                console.log(`Admin password updated: ${admin.email}`);
            }
        }
    } catch (err) {
        console.error("Error seeding admins:", err);
    } finally {
        await client.end();
    }
}

seedAdmins();
