import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkLatest() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Checking sessions created in the last hour...");
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 3600*1000).toISOString();
        
        const sessions = await sql`
            SELECT id, created_at, race_id FROM telemetry_sessions 
            WHERE created_at > ${hourAgo}
            ORDER BY created_at DESC
        `;
        
        console.table(sessions);

        if (sessions.length > 0) {
            const sid = sessions[0].id;
            const participants = await sql`
                SELECT id, game_name, car_index, is_human, driver_id 
                FROM telemetry_participants 
                WHERE session_id = ${sid}
            `;
            console.table(participants);
        } else {
            console.log("No new sessions in the last hour.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkLatest();
