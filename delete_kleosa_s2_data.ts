import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function deleteKleosaS2Data() {
    try {
        console.log('🗑️ Deleting Kleosa S2 telemetry data...\n');

        console.log('1. Finding Kleosa S2 league...');
        const leagues = await sql`SELECT id FROM leagues WHERE name = 'Kleosa S2'`;

        if (leagues.length === 0) {
            console.log('❌ Liga "Kleosa S2" nicht gefunden.');
            return;
        }

        const leagueId = leagues[0].id;
        console.log('✅ Found league ID:', leagueId);

        console.log('\n2. Finding all telemetry sessions...');
        const sessions = await sql`SELECT id FROM telemetry_sessions WHERE league_id = ${leagueId}`;
        console.log('✅ Found', sessions.length, 'sessions');

        if (sessions.length === 0) {
            console.log('ℹ️ Keine Telemetrie-Sessions gefunden.');
            return;
        }

        const sessionIds = sessions.map(s => s.id);
        console.log('Session IDs:', sessionIds);

        console.log('\n3. Deleting telemetry data (respecting foreign keys)...\n');

        let count = 0;

        // Delete lap samples
        count++;
        console.log(`${count}. Deleting telemetry_lap_samples...`);
        await sql`
            DELETE FROM telemetry_lap_samples 
            WHERE lap_id IN (
                SELECT id FROM telemetry_laps 
                WHERE participant_id IN (
                    SELECT id FROM telemetry_participants 
                    WHERE session_id = ANY(${sessionIds})
                )
            )
        `;
        console.log('✅ Deleted');

        // Delete laps
        count++;
        console.log(`${count}. Deleting telemetry_laps...`);
        await sql`
            DELETE FROM telemetry_laps 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('✅ Deleted');

        // Delete car setups
        count++;
        console.log(`${count}. Deleting telemetry_car_setups...`);
        await sql`
            DELETE FROM telemetry_car_setups 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('✅ Deleted');

        // Delete tyre sets
        count++;
        console.log(`${count}. Deleting telemetry_tyre_sets...`);
        await sql`
            DELETE FROM telemetry_tyre_sets 
            WHERE participant_id IN (
                SELECT id FROM telemetry_participants 
                WHERE session_id = ANY(${sessionIds})
            )
        `;
        console.log('✅ Deleted');

        // Delete speed traps
        count++;
        console.log(`${count}. Deleting telemetry_speed_traps...`);
        await sql`
            DELETE FROM telemetry_speed_traps 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('✅ Deleted');

        // Delete participants
        count++;
        console.log(`${count}. Deleting telemetry_participants...`);
        await sql`
            DELETE FROM telemetry_participants 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('✅ Deleted');

        // Delete position history
        count++;
        console.log(`${count}. Deleting telemetry_position_history...`);
        await sql`
            DELETE FROM telemetry_position_history 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('✅ Deleted');

        // Delete incidents
        count++;
        console.log(`${count}. Deleting telemetry_incidents...`);
        await sql`
            DELETE FROM telemetry_incidents 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('✅ Deleted');

        // Delete safety car events
        count++;
        console.log(`${count}. Deleting telemetry_safety_car_events...`);
        await sql`
            DELETE FROM telemetry_safety_car_events 
            WHERE session_id = ANY(${sessionIds})
        `;
        console.log('✅ Deleted');

        // Delete sessions
        count++;
        console.log(`${count}. Deleting telemetry_sessions...`);
        await sql`
            DELETE FROM telemetry_sessions 
            WHERE league_id = ${leagueId}
        `;
        console.log('✅ Deleted');

        console.log('\n🎉 All Kleosa S2 telemetry data successfully deleted!');

    } catch (err) {
        console.error('❌ Fehler:', err);
        process.exit(1);
    }
}

deleteKleosaS2Data();
