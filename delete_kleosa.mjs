import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('🗑️  Deleting Kleosa S2 telemetry data...\n');

  try {
    // Find league
    const leagues = await sql`SELECT id FROM leagues WHERE name = 'Kleosa S2'`;

    if (!leagues.length) {
      console.log('❌ Liga "Kleosa S2" nicht gefunden.');
      process.exit(0);
    }

    const leagueId = leagues[0].id;
    console.log('✅ Found league ID:', leagueId);

    // Find sessions
    const sessions = await sql`SELECT id FROM telemetry_sessions WHERE league_id = ${leagueId}`;
    console.log('✅ Found', sessions.length, 'telemetry sessions\n');

    if (!sessions.length) {
      console.log('ℹ️ Keine Telemetrie-Sessions gefunden.');
      process.exit(0);
    }

    const sessionIds = sessions.map(s => s.id);

    // Delete in correct order
    console.log('Deleting telemetry data...\n');

    console.log('1. Deleting telemetry_lap_samples...');
    await sql`DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT id FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY(${sessionIds})))`;
    console.log('✅ Done');

    console.log('2. Deleting telemetry_laps...');
    await sql`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY(${sessionIds}))`;
    console.log('✅ Done');

    console.log('3. Deleting telemetry_car_setups...');
    await sql`DELETE FROM telemetry_car_setups WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY(${sessionIds}))`;
    console.log('✅ Done');

    console.log('4. Deleting telemetry_tyre_sets...');
    await sql`DELETE FROM telemetry_tyre_sets WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY(${sessionIds}))`;
    console.log('✅ Done');

    console.log('5. Deleting telemetry_speed_traps...');
    await sql`DELETE FROM telemetry_speed_traps WHERE session_id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('6. Deleting telemetry_participants...');
    await sql`DELETE FROM telemetry_participants WHERE session_id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('7. Deleting telemetry_position_history...');
    await sql`DELETE FROM telemetry_position_history WHERE session_id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('8. Deleting telemetry_incidents...');
    await sql`DELETE FROM telemetry_incidents WHERE session_id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('9. Deleting telemetry_safety_car_events...');
    await sql`DELETE FROM telemetry_safety_car_events WHERE session_id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('10. Deleting telemetry_sessions...');
    await sql`DELETE FROM telemetry_sessions WHERE id = ANY(${sessionIds})`;
    console.log('✅ Done');

    console.log('\n🎉 All Kleosa S2 telemetry data successfully deleted!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

