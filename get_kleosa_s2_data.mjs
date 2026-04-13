import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function getKleosaS2Data() {
    try {
        // Find the league ID for "Kleosa S2"
        const leagueName = 'Kleosa S2';
        const leagues = await sql`SELECT id, name, created_at FROM leagues WHERE name = ${leagueName}`;
        if (leagues.length === 0) {
            console.log('Liga "Kleosa S2" nicht gefunden.');
            return;
        }
        const league = leagues[0];
        console.log('Liga gefunden:', league);

        // Get all sessions for this league
        const sessions = await sql`SELECT id, race_id, track_id, session_type, is_active, created_at, updated_at FROM telemetry_sessions WHERE league_id = ${league.id} ORDER BY created_at DESC`;
        console.log('Sessions:', sessions.length);
        console.table(sessions);

        // For each session, get participants
        for (const session of sessions) {
            console.log(`\n--- Session ${session.id} ---`);
            const participants = await sql`SELECT id, game_name, driver_id, car_index, position, is_human, pit_stops, warnings, penalties_time FROM telemetry_participants WHERE session_id = ${session.id}`;
            console.log('Participants:', participants.length);
            console.table(participants);

            // Get laps for each participant
            for (const participant of participants) {
                const laps = await sql`SELECT lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms FROM telemetry_laps WHERE participant_id = ${participant.id} ORDER BY lap_number`;
                if (laps.length > 0) {
                    console.log(`Laps for ${participant.game_name}:`, laps.length);
                    console.table(laps.slice(0, 10)); // Show first 10 laps
                    if (laps.length > 10) console.log(`... and ${laps.length - 10} more laps`);
                }
            }

            // Get position history
            const positions = await sql`SELECT lap_number, car_index, position FROM telemetry_position_history WHERE session_id = ${session.id} ORDER BY lap_number, position`;
            if (positions.length > 0) {
                console.log('Position History (first 20):', positions.length);
                console.table(positions.slice(0, 20));
                if (positions.length > 20) console.log(`... and ${positions.length - 20} more`);
            }

            // Get incidents
            const incidents = await sql`SELECT type, details, vehicle_idx, other_vehicle_idx, lap_num, timestamp FROM telemetry_incidents WHERE session_id = ${session.id}`;
            if (incidents.length > 0) {
                console.log('Incidents:', incidents.length);
                console.table(incidents);
            }

            // Get safety car events
            const safetyCarEvents = await sql`SELECT safety_car_type, event_type, lap_number, created_at FROM telemetry_safety_car_events WHERE session_id = ${session.id}`;
            if (safetyCarEvents.length > 0) {
                console.log('Safety Car Events:', safetyCarEvents.length);
                console.table(safetyCarEvents);
            }
        }

        // Get races for this league
        const races = await sql`SELECT id, track, race_date, is_finished, scheduled_date FROM races WHERE league_id = ${league.id} ORDER BY race_date DESC`;
        console.log('Rennen:', races.length);
        console.table(races);

        // Get drivers for this league
        const drivers = await sql`SELECT id, name, game_name, total_points, raw_points FROM drivers WHERE league_id = ${league.id}`;
        console.log('Fahrer:', drivers.length);
        console.table(drivers);

        // Get points config
        const pointsConfigs = await sql`SELECT * FROM points_config WHERE league_id = ${league.id}`;
        const pointsConfig = pointsConfigs[0];
        console.log('Punkte-Konfiguration:', pointsConfig);

        // Get teams
        const teams = await sql`SELECT id, name, color FROM teams WHERE league_id = ${league.id}`;
        console.log('Teams:', teams.length);
        console.table(teams);

    } catch (err) {
        console.error('Fehler:', err);
    }
}

getKleosaS2Data();
