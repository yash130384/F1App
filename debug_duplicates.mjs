import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkLaps() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        // Suche nach Session ID von Australia (fae32427-...) oder China (f2dc30df-...)
        // Wir suchen Teilnehmer "Markus Lanz" (in der China Session)
        console.log("Suche nach Markus Lanz in China...");
        const parts = await sql`
            SELECT id, session_id, game_name 
            FROM telemetry_participants 
            WHERE game_name ILIKE '%Markus%' 
            ORDER BY id DESC LIMIT 5
        `;
        console.table(parts);

        if (parts.length > 0) {
            const pId = parts[0].id;
            console.log(`\nLaps für participant ${pId} (Runde 1-5):`);
            const laps = await sql`
                SELECT id, lap_number, lap_time_ms, sector1_ms, sector2_ms, sector3_ms 
                FROM telemetry_laps 
                WHERE participant_id = ${pId} AND lap_number <= 5
                ORDER BY lap_number ASC
            `;
            console.table(laps);
            
            // Checking total duplicates
            const dups = await sql`
                SELECT lap_number, count(*) as c 
                FROM telemetry_laps 
                WHERE participant_id = ${pId} 
                GROUP BY lap_number 
                HAVING COUNT(*) > 1
            `;
            console.log(`\nRunden mit Duplikaten: ${dups.length}`);
            console.table(dups);
        }
    } catch(e) {
        console.error(e);
    }
}
checkLaps();
