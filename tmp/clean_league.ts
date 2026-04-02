import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env manually for standalone scripts
dotenv.config({ path: path.join(__dirname, '../.env') });

const leagueId = '910e9491-aa59-4246-9f3d-f49c3dc555ed';
const sql = neon(process.env.DATABASE_URL!);

async function run(sqlStr: string, params: any[] = []) {
    let pSql = sqlStr;
    let counter = 1;
    pSql = pSql.replace(/\?/g, () => `$${counter++}`);
    return await (sql as any).query(pSql, params);
}

async function cleanKleosaSessions() {
    console.log(`Starting cleanup for League ID: ${leagueId} using direct Neon client...`);

    try {
        // 1. Delete Samples
        console.log("Cleaning telemetry lap samples...");
        await run(`
            DELETE FROM telemetry_lap_samples
            WHERE lap_id IN (
                SELECT tl.id
                FROM telemetry_laps tl
                JOIN telemetry_participants tp ON tl.participant_id = tp.id
                JOIN telemetry_sessions ts ON tp.session_id = ts.id
                WHERE ts.league_id = ?
            )
        `, [leagueId]);

        // 2. Delete Sessions (this will cascade delete participants, laps, stints, incidents, setups, etc.)
        console.log("Deleting telemetry sessions (cascading)...");
        await run(`
            DELETE FROM telemetry_sessions
            WHERE league_id = ?
        `, [leagueId]);

        console.log("Cleanup successful! All telemetry data for Kleosa S2 has been removed from Neon.");
    } catch (e) {
        console.error("Cleanup failed:", e);
    }
}

cleanKleosaSessions();
