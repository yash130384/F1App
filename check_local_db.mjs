import Database from 'better-sqlite3';
import path from 'path';

async function checkLocal() {
    try {
        const db = new Database('league.db');
        
        console.log("Checking latest sessions in LOCAL SQLite...");
        const sessions = db.prepare('SELECT id, created_at FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5').all();
        console.table(sessions);

        if (sessions.length > 0) {
            const sid = sessions[0].id;
            console.log(`Checking sectors for latest local session: ${sid}`);
            const stats = db.prepare(`
                SELECT 
                    COUNT(*) as total_laps,
                    SUM(CASE WHEN sector1_ms > 0 THEN 1 ELSE 0 END) as s1,
                    SUM(CASE WHEN sector2_ms > 0 THEN 1 ELSE 0 END) as s2,
                    SUM(CASE WHEN sector3_ms > 0 THEN 1 ELSE 0 END) as s3
                FROM telemetry_laps tl
                JOIN telemetry_participants tp ON tl.participant_id = tp.id
                WHERE tp.session_id = ?
            `).get(sid);
            console.table([stats]);
            
            console.log("Checking participants car_index in local DB:");
            const parts = db.prepare('SELECT game_name, car_index, is_human FROM telemetry_participants WHERE session_id = ?').all(sid);
            console.table(parts);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkLocal();
