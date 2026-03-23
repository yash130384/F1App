import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function fixDuplicatesFast() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Suche doppelte Runden für die aktuellen Sessions...");
        
        // Finde alle Teilnehmer der China und Australia Sessions
        const participants = await sql`
            SELECT id FROM telemetry_participants 
            WHERE session_id IN ('043b49c1-adda-4e3a-8e46-9ee8102a07b3', '43cb756a-0178-4f0a-97d8-c22ff918b5e0')
        `;
        
        const pIds = participants.map(p => p.id);
        if (pIds.length === 0) return;
        
        let fixedCount = 0;
        let deletedCount = 0;
        
        const updatePromises = [];
        const deletePromises = [];

        console.log(`Verarbeite ${pIds.length} Teilnehmer...`);
        for (const pId of pIds) {
            const dupLaps = await sql`
                SELECT lap_number 
                FROM telemetry_laps 
                WHERE participant_id = ${pId} 
                GROUP BY lap_number 
                HAVING COUNT(*) > 1
            `;
            
            for (const dup of dupLaps) {
                const lapNum = dup.lap_number;
                
                const rows = await sql`
                    SELECT id, lap_time_ms, sector1_ms, sector2_ms, sector3_ms, tyre_compound, is_valid
                    FROM telemetry_laps 
                    WHERE participant_id = ${pId} AND lap_number = ${lapNum}
                    ORDER BY lap_time_ms DESC
                `;
                
                if (rows.length < 2) continue;
                
                let maxTime = 0;
                let maxS1 = null;
                let maxS2 = null;
                let maxS3 = null;
                let maxTyre = null;
                let maxValid = false;
                
                for (const r of rows) {
                    if (r.lap_time_ms && r.lap_time_ms > maxTime) maxTime = r.lap_time_ms;
                    if (r.sector1_ms && (!maxS1 || r.sector1_ms > maxS1)) maxS1 = r.sector1_ms;
                    if (r.sector2_ms && (!maxS2 || r.sector2_ms > maxS2)) maxS2 = r.sector2_ms;
                    if (r.sector3_ms && (!maxS3 || r.sector3_ms > maxS3)) maxS3 = r.sector3_ms;
                    if (r.tyre_compound !== null) maxTyre = r.tyre_compound;
                    if (r.is_valid === true) maxValid = true;
                }
                
                const keepId = rows[0].id;
                
                // Wir sammeln die Promises für bulk execution!
                updatePromises.push((async () => {
                    await sql`
                        UPDATE telemetry_laps 
                        SET lap_time_ms = ${maxTime}, sector1_ms = ${maxS1}, sector2_ms = ${maxS2}, sector3_ms = ${maxS3}, tyre_compound = ${maxTyre}, is_valid = ${maxValid}
                        WHERE id = ${keepId}
                    `;
                    fixedCount++;
                })());
                
                for (let i = 1; i < rows.length; i++) {
                    deletePromises.push((async () => {
                        await sql`DELETE FROM telemetry_laps WHERE id = ${rows[i].id}`;
                        deletedCount++;
                    })());
                }
            }
        }
        
        console.log(`Warte auf Ausführung von ${updatePromises.length} Updates und ${deletePromises.length} Deletes...`);
        // Batch promises to avoid overwhelming the database connection pool
        const processInBatches = async (promises, batchSize) => {
            for (let i = 0; i < promises.length; i += batchSize) {
                await Promise.all(promises.slice(i, i + batchSize));
            }
        };
        await processInBatches(updatePromises, 100);
        await processInBatches(deletePromises, 100);

        console.log(`\nFertig! ${fixedCount} Runden zusammengeführt. ${deletedCount} redundante Zeilen gelöscht.`);
        
    } catch(e) {
        console.error(e);
    }
}

fixDuplicatesFast();
