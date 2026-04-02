import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
    const leagueName = 'Kleosa S2';
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) process.exit(1);

    const sql = neon(dbUrl);
    try {
        const leagues = await sql.query('SELECT id FROM leagues WHERE name = $1', [leagueName]);
        if (leagues.length === 0) {
            console.log(`League ${leagueName} missing.`);
            process.exit(0);
        }
        const leagueId = leagues[0].id;
        console.log(`Cleaning S2: ${leagueId}`);
        await sql.query(`DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT tl.id FROM telemetry_laps tl JOIN telemetry_participants tp ON tl.participant_id = tp.id JOIN telemetry_sessions ts ON tp.session_id = ts.id WHERE ts.league_id = $1)`, [leagueId]);
        await sql.query('DELETE FROM telemetry_sessions WHERE league_id = $1', [leagueId]);
        console.log('✅ Cleanup S2 done.');
        process.exit(0);
    } catch (e) {
        console.error('Cleanup ERROR', e);
        process.exit(1);
    }
}
cleanup();
