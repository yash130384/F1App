import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkRecentSessions() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Die 10 neuesten Telemetry Sessions in der gesamten Neon DB:");
        const recent = await sql`
            SELECT id, league_id, race_id, track_id, created_at, session_type 
            FROM telemetry_sessions 
            ORDER BY created_at DESC
            LIMIT 10
        `;
        console.table(recent);

        console.log("\nLigen in der DB:");
        const leagues = await sql`SELECT id, name FROM leagues`;
        console.table(leagues);
        
    } catch (err) {
        console.error("Error:", err);
    }
}

checkRecentSessions();
