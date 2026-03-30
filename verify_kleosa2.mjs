import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkUnlinked() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Suche Liga 'Kleosa Season1'...");
        const leagues = await sql`SELECT id, name FROM leagues WHERE name ILIKE '%Kleosa%'`;
        const leagueId = leagues[0].id;

        console.log(`\nUnverknüpfte Telemetry Sessions für Liga ${leagueId}:`);
        const unlinked = await sql`
            SELECT id, track_id, created_at, session_type 
            FROM telemetry_sessions 
            WHERE league_id = ${leagueId} AND race_id IS NULL
            ORDER BY created_at DESC
        `;
        console.table(unlinked);

        for (const sess of unlinked.slice(0, 3)) {
            console.log(`\n--- Details für Session: ${sess.id} ---`);
            const parts = await sql`SELECT count(*) as p_count FROM telemetry_participants WHERE session_id = ${sess.id}`;
            const mappedParts = await sql`SELECT count(*) as m_count FROM telemetry_participants WHERE session_id = ${sess.id} AND driver_id IS NOT NULL`;
            console.log(`Teilnehmer: ${parts[0].p_count} (Davon gemappt: ${mappedParts[0].m_count})`);

            const laps = await sql`
                SELECT count(*) as l_count 
                FROM telemetry_laps 
                WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sess.id})
            `;
            console.log(`Runden gesamt: ${laps[0].l_count}`);
            
            const posHistory = await sql`
                SELECT count(*) as ph_count 
                FROM telemetry_position_history 
                WHERE session_id = ${sess.id}
            `;
            console.log(`Positions-Historie (Charts): ${posHistory[0].ph_count}`);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

checkUnlinked();
