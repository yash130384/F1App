import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkKleosa() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Suche Liga 'Kleosa Season1'...");
        const leagues = await sql`SELECT id, name FROM leagues WHERE name ILIKE '%Kleosa%'`;
        if (leagues.length === 0) {
            console.log("Liga nicht gefunden.");
            return;
        }
        console.table(leagues);
        const leagueId = leagues[0].id;

        console.log(`\nSuche Rennen für Liga ${leagueId}...`);
        const races = await sql`
            SELECT id, track, created_at, is_finished 
            FROM races 
            WHERE league_id = ${leagueId} 
            ORDER BY created_at DESC
        `;
        console.table(races);

        for (const race of races) {
            console.log(`\n--- Prüfe Details für Rennen: ${race.track} (Race ID: ${race.id}) ---`);
            
            // 1. Race Results
            const results = await sql`SELECT count(*) as result_count FROM race_results WHERE race_id = ${race.id}`;
            console.log(`Race Results Records: ${results[0].result_count}`);

            // 2. Telemetry Sessions
            const sessions = await sql`SELECT id, created_at FROM telemetry_sessions WHERE race_id = ${race.id}`;
            console.log(`Verknüpfte Telemetry Sessions: ${sessions.length}`);
            
            for (const sess of sessions) {
                console.log(`  -> Session ID: ${sess.id} (erstellt: ${sess.created_at})`);
                
                // 3. Participants
                const parts = await sql`SELECT count(*) as p_count FROM telemetry_participants WHERE session_id = ${sess.id}`;
                
                // 4. Mapped Participants (mit driver_id)
                const mappedParts = await sql`SELECT count(*) as m_count FROM telemetry_participants WHERE session_id = ${sess.id} AND driver_id IS NOT NULL`;
                
                console.log(`     Teilnehmer: ${parts[0].p_count} (Davon gemappt: ${mappedParts[0].m_count})`);

                // 5. Laps
                const laps = await sql`
                    SELECT count(*) as l_count 
                    FROM telemetry_laps 
                    WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sess.id})
                `;
                console.log(`     Runden gesamt: ${laps[0].l_count}`);
                
                // 6. Position History
                const posHistory = await sql`
                    SELECT count(*) as ph_count 
                    FROM telemetry_position_history 
                    WHERE session_id = ${sess.id}
                `;
                console.log(`     Positions-Historie (Charts): ${posHistory[0].ph_count}`);
            }
        }
        
    } catch (err) {
        console.error("Error:", err);
    }
}

checkKleosa();
