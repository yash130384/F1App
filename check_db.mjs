import { query } from './src/lib/db.js';

async function check() {
    try {
        const sessions = await query('SELECT id, track_id, session_type, is_active, created_at, updated_at FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5');
        console.log('--- Telemetry Sessions ---');
        console.table(sessions);

        if (sessions.length > 0) {
            const sid = sessions[0].id;
            const participants = await query('SELECT id, game_name, is_human, position FROM telemetry_participants WHERE session_id = ?', [sid]);
            console.log(`--- Participants for session ${sid} ---`);
            console.table(participants);

            const laps = await query('SELECT count(*) as lap_count FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?)', [sid]);
            console.log('--- Lap Count ---');
            console.table(laps);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
