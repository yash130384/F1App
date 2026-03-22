import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Checking newest session and sectors in Neon...");
        const sessions = await sql`
            SELECT id, created_at FROM telemetry_sessions ORDER BY created_at DESC LIMIT 1
        `;
        if (sessions.length === 0) return;
        
        const sid = sessions[0].id;
        console.log(`Latest Session: ${sid} (${sessions[0].created_at})`);

        const stats = await sql`
            SELECT 
                COUNT(*) as total_laps,
                COUNT(*) FILTER (WHERE sector1_ms > 0) as s1,
                COUNT(id) FILTER (WHERE sector2_ms > 0) as s2
            FROM telemetry_laps
            WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid})
        `;
        console.table(stats);

    } catch (err) {
        console.error("Error:", err);
    }
}

verify();
