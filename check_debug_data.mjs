import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkParticipants() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Checking last 5 telemetry sessions and their participants...");
        
        const sessions = await sql`
            SELECT id, created_at, race_id FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5
        `;
        
        for (const s of sessions) {
            console.log(`\nSession: ${s.id} (Race: ${s.race_id}) Created: ${s.created_at}`);
            const participants = await sql`
                SELECT tp.id, tp.game_name, tp.driver_id, tp.is_human, 
                       (SELECT COUNT(*) FROM telemetry_laps WHERE participant_id = tp.id) as lap_count,
                       (SELECT COUNT(*) FROM telemetry_position_history WHERE session_id = tp.session_id AND car_index = tp.car_index) as pos_history_count
                FROM telemetry_participants tp
                WHERE tp.session_id = ${s.id}
            `;
            console.table(participants);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkParticipants();
