import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkCarIndex() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        const sessions = await sql`
            SELECT id FROM telemetry_sessions ORDER BY created_at DESC LIMIT 1
        `;
        
        if (sessions.length === 0) return;
        const sessionId = sessions[0].id;
        
        console.log(`Checking participants for session: ${sessionId}`);
        const participants = await sql`
            SELECT id, game_name, car_index, is_human, driver_id 
            FROM telemetry_participants 
            WHERE session_id = ${sessionId}
        `;
        console.table(participants);

    } catch (err) {
        console.error("Error:", err);
    }
}

checkCarIndex();
