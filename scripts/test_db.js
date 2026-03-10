const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env' });

async function test() {
    const sql = neon(process.env.DATABASE_URL);

    // Update existing Test01 sessions
    console.log('Fixing Test01 sessions...');
    await sql`UPDATE telemetry_sessions SET league_id = '2e3f0f42-a93a-4fbb-9d4d-8f62e0296fa1' WHERE league_id ILIKE 'test01'`;
    await sql`UPDATE races SET league_id = '2e3f0f42-a93a-4fbb-9d4d-8f62e0296fa1' WHERE league_id ILIKE 'test01'`;

    const sessions = await sql`SELECT id, league_id, session_type, race_id FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5`;
    console.log('Sessions:', sessions);

    const races = await sql`SELECT id, league_id, track, is_finished FROM races ORDER BY race_date DESC LIMIT 5`;
    console.log('Races:', races);
}

test().catch(console.error);
