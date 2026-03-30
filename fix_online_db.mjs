import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function fix() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        // 1. Hole alle Teilnehmer, denen der car_index fehlt
        const participants = await sql`
            SELECT id, session_id, position, game_name 
            FROM telemetry_participants 
            WHERE car_index IS NULL
        `;
        console.log(`Gefunden: ${participants.length} Teilnehmer ohne car_index.`);
        
        let fixedCount = 0;
        
        for (const p of participants) {
            if (!p.position) {
                console.log(`[Überspringe] ${p.game_name} - keine Endposition hinterlegt.`);
                continue;
            }
            
            // Finde den car_index aus der Historie, der am Ende auf dieser Position war
            // (Indem wir die letzte Runde für diese Session und Position abfragen)
            const historyRows = await sql`
                SELECT car_index, lap_number, position
                FROM telemetry_position_history 
                WHERE session_id = ${p.session_id} 
                  AND position = ${p.position}
                ORDER BY lap_number DESC
                LIMIT 1
            `;
            
            if (historyRows.length > 0) {
                const matchedCarIndex = historyRows[0].car_index;
                await sql`
                    UPDATE telemetry_participants 
                    SET car_index = ${matchedCarIndex} 
                    WHERE id = ${p.id}
                `;
                console.log(`[Geheilt] ${p.game_name} -> car_index: ${matchedCarIndex}`);
                fixedCount++;
            } else {
                console.log(`[Nicht gefunden] ${p.game_name} - Keine Positionshistorie für Pos ${p.position} gefunden.`);
            }
        }
        
        console.log(`\nFertig. ${fixedCount} Datensätze erfolgreich aktualisiert.`);
    } catch (err) {
        console.error("FEHLER:", err);
    }
}

fix();
