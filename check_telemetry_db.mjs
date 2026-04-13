import { query } from './src/lib/db.js';

async function checkTelemetryTables() {
    try {
        console.log('Checking telemetry_sessions...');
        const sessions = await query('SELECT * FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5');
        console.table(sessions);

        console.log('\nChecking telemetry_participants...');
        const participants = await query('SELECT id, session_id, game_name, driver_id, team_id, car_index, start_position, position, lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time, visual_tyre_compound, actual_tyre_compound, tyre_age_laps, engine_power_ice, engine_power_mguk, total_race_time, penalties_count, steering_assist, braking_assist, gearbox_assist, traction_control, anti_lock_brakes FROM telemetry_participants ORDER BY created_at DESC LIMIT 10');
        console.table(participants);

        console.log('\nChecking telemetry_laps...');
        const laps = await query('SELECT id, participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms, pit_stop_timer_ms, pit_lane_time_ms FROM telemetry_laps ORDER BY created_at DESC LIMIT 10');
        console.table(laps);

        console.log('\nChecking telemetry_position_history...');
        const positions = await query('SELECT id, session_id, car_index, lap_number, position FROM telemetry_position_history ORDER BY created_at DESC LIMIT 10');
        console.table(positions);

        console.log('\nChecking telemetry_incidents...');
        const incidents = await query('SELECT * FROM telemetry_incidents ORDER BY timestamp DESC LIMIT 5');
        console.table(incidents);

        console.log('\nChecking telemetry_safety_car_events...');
        const safety = await query('SELECT * FROM telemetry_safety_car_events ORDER BY created_at DESC LIMIT 5');
        console.table(safety);

        console.log('\nChecking telemetry_lap_samples...');
        const samples = await query('SELECT id, lap_id FROM telemetry_lap_samples ORDER BY created_at DESC LIMIT 5');
        console.table(samples);

    } catch (err) {
        console.error('Fehler:', err);
    }
}

checkTelemetryTables();
