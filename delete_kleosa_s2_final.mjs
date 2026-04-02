#!/usr/bin/env node

import 'dotenv/config.js';

async function deleteKleosaS2() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    console.log('🗑️  Deleting Kleosa S2 telemetry data...\n');

    try {
        const pgUrl = new URL(databaseUrl);
        const { Client } = await import('pg');

        const client = new Client({
            connectionString: databaseUrl,
        });

        await client.connect();
        console.log('✅ Connected to database\n');

        // Find league
        const leagueResult = await client.query(
            'SELECT id FROM leagues WHERE name = $1',
            ['Kleosa S2']
        );

        if (leagueResult.rows.length === 0) {
            console.log('❌ Liga "Kleosa S2" nicht gefunden.');
            await client.end();
            return;
        }

        const leagueId = leagueResult.rows[0].id;
        console.log('✅ Found league ID:', leagueId);

        // Find all sessions
        const sessionsResult = await client.query(
            'SELECT id FROM telemetry_sessions WHERE league_id = $1',
            [leagueId]
        );
        console.log('✅ Found', sessionsResult.rows.length, 'telemetry sessions\n');

        if (sessionsResult.rows.length === 0) {
            console.log('ℹ️  Keine Telemetrie-Sessions gefunden.');
            await client.end();
            return;
        }

        const sessionIds = sessionsResult.rows.map(r => r.id);

        // Execute deletions in correct order
        console.log('Deleting telemetry data...\n');

        const queries = [
            { name: 'telemetry_lap_samples', query: `DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT id FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1)))` },
            { name: 'telemetry_laps', query: `DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1))` },
            { name: 'telemetry_car_setups', query: `DELETE FROM telemetry_car_setups WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1))` },
            { name: 'telemetry_tyre_sets', query: `DELETE FROM telemetry_tyre_sets WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1))` },
            { name: 'telemetry_speed_traps', query: `DELETE FROM telemetry_speed_traps WHERE session_id = ANY($1)` },
            { name: 'telemetry_participants', query: `DELETE FROM telemetry_participants WHERE session_id = ANY($1)` },
            { name: 'telemetry_position_history', query: `DELETE FROM telemetry_position_history WHERE session_id = ANY($1)` },
            { name: 'telemetry_incidents', query: `DELETE FROM telemetry_incidents WHERE session_id = ANY($1)` },
            { name: 'telemetry_safety_car_events', query: `DELETE FROM telemetry_safety_car_events WHERE session_id = ANY($1)` },
            { name: 'telemetry_sessions', query: `DELETE FROM telemetry_sessions WHERE id = ANY($1)` },
        ];

        for (const { name, query } of queries) {
            const result = await client.query(query, [sessionIds]);
            console.log(`✅ Deleted ${result.rowCount} rows from ${name}`);
        }

        console.log('\n🎉 All Kleosa S2 telemetry data successfully deleted!');

        await client.end();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

deleteKleosaS2();

