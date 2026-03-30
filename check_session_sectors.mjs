import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkSectors() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const sid = '9875a46e-6d0b-42aa-9178-ab0facbf7584';

        const stats = await sql`
            SELECT 
                COUNT(*) as total_laps,
                COUNT(*) FILTER (WHERE sector1_ms > 0) as s1,
                COUNT(*) FILTER (WHERE sector2_ms > 0) as s2,
                COUNT(*) FILTER (WHERE sector3_ms > 0) as s3
            FROM telemetry_laps
            WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid})
        `;
        console.table(stats);

    } catch (err) {
        console.error("Error:", err);
    }
}

checkSectors();
