import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function deleteKleosaS2Data() {
    try {
        console.log('Finding Kleosa S2 league...');
        const leagues = await sql`SELECT id FROM leagues WHERE name = 'Kleosa S2'`;

        if (leagues.length === 0) {
            console.log('Liga "Kleosa S2" nicht gefunden.');
            return;
        }

        const leagueId = leagues[0].id;
        console.log('Found Kleosa S2 league:', leagueId);

        // Find all sessions for this league
        console.log('\nFinding all telemetry sessions for Kleosa S2...');
        const sessions = await sql`SELECT id FROM telemetry_sessions WHERE league_id = ${leagueId}`;
        console.log('Found', sessions.length, 'telemetry sessions');

        if (sessions.length === 0) {
            console.log('Keine Telemetrie-Sessions gefunden.');
            return;
        }

        const sessionIds = sessions.map(s => s.id);

        // Delete data in correct order (respecting foreign keys)
        console.log('\nDeleting telemetry data...');

        // 1. Delete lap samples
        const samplesDeleted = await sql`
            DELETE FROM telemetry_lap_samples 
            WHERE lap_id IN (
                SELECT id FROM telemetry_laps 
                WHERE participant_id IN (
                    SELECT id FROM telemetry_participants 
                    WHERE session_id = ANY(${sessionIds})
                )
            )
        `;
        console.log('Deleted telemetry_lap_samples records');

        // 2. Delete laps
        const lapsDeleted = await sql`
            DELETE FROM telemetry_laps 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('Deleted telemetry_laps records');

        // 3. Delete car setups
        const setupsDeleted = await sql`
            DELETE FROM telemetry_car_setups 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('Deleted telemetry_car_setups records');

        // 4. Delete tyre sets
        const tyresDeleted = await sql`
            DELETE FROM telemetry_tyre_sets 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('Deleted telemetry_tyre_sets records');

        // 5. Delete speed traps
        const speedTrapsDeleted = await sql`
            DELETE FROM telemetry_speed_traps 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_speed_traps records');

        // 6. Delete participants
        const participantsDeleted = await sql`
            DELETE FROM telemetry_participants 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_participants records');

        // 7. Delete position history
        const positionsDeleted = await sql`
            DELETE FROM telemetry_position_history 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_position_history records');

        // 8. Delete incidents
        const incidentsDeleted = await sql`
            DELETE FROM telemetry_incidents 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_incidents records');

        // 9. Delete safety car events
        const safetyDeleted = await sql`
            DELETE FROM telemetry_safety_car_events 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_safety_car_events records');

        // 10. Delete sessions
        const sessionsDeleted = await sql`
            DELETE FROM telemetry_sessions 
            WHERE id = ANY(${sessionIds})
        `;
        console.log('Deleted telemetry_sessions records');

        console.log('\n✅ All Kleosa S2 telemetry data deleted successfully!');

    } catch (err) {
        console.error('Fehler:', err);
    }
}

deleteKleosaS2Data();
