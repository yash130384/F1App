import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) process.exit(1);
    const sql = neon(dbUrl);
    try {
        const laps = await sql.query('SELECT count(*) as count FROM telemetry_laps');
        const sessions = await sql.query('SELECT count(*) as count FROM telemetry_sessions');
        console.log('--- DB STATUS ---');
        console.log('LAPS:', laps[0].count);
        console.log('SESSIONS:', sessions[0].count);
        process.exit(0);
    } catch (e) {
        console.error('ERROR', e);
        process.exit(1);
    }
}
check();
