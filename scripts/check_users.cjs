const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
    try {
        const u = await sql`SELECT id, username, email FROM users`;
        console.log(JSON.stringify(u, null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
