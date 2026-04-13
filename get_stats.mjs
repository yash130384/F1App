import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function getStats() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("=== F1 App Datenbank-Statistiken ===\n");
        
        // Gesamtzahl der Ligen
        const leagues = await sql`SELECT COUNT(*) as count FROM leagues`;
        console.log(`Anzahl Ligen: ${leagues[0].count}`);
        
        // Gesamtzahl der Rennen
        const races = await sql`SELECT COUNT(*) as count FROM races`;
        console.log(`Anzahl Rennen: ${races[0].count}`);
        
        // Gesamtzahl der Fahrer
        const drivers = await sql`SELECT COUNT(*) as count FROM drivers`;
        console.log(`Anzahl Fahrer: ${drivers[0].count}`);
        
        // Gesamtzahl der Runden (alle Sessions)
        const totalLaps = await sql`SELECT COUNT(*) as count FROM telemetry_laps`;
        console.log(`Gesamtzahl aller Runden: ${totalLaps[0].count}`);
        
        // Gesamtzahl der Positions-Einträge (alle Fahrer, alle Runden)
        const positionHistory = await sql`SELECT COUNT(*) as count FROM telemetry_position_history`;
        console.log(`Gesamtzahl der Positions-Datensätze: ${positionHistory[0].count}`);
        
        // Durchschnittliche Positions-Daten pro Fahrer
        const avgPositionsPerDriver = await sql`
            SELECT 
                AVG(position_count) as avg_positions_per_driver
            FROM (
                SELECT 
                    d.id as driver_id,
                    COUNT(tph.id) as position_count
                FROM drivers d
                LEFT JOIN telemetry_participants tp ON d.id = tp.driver_id
                LEFT JOIN telemetry_position_history tph ON tp.id = tph.car_index AND tp.sessionId = tph.sessionId
                GROUP BY d.id
            ) as driver_counts
        `;
        
        // Durchschnittliche Runden pro Fahrer
        const avgLapsPerDriver = await sql`
            SELECT 
                AVG(lap_count) as avg_laps_per_driver
            FROM (
                SELECT 
                    d.id as driver_id,
                    COUNT(tl.id) as lap_count
                FROM drivers d
                LEFT JOIN telemetry_participants tp ON d.id = tp.driver_id
                LEFT JOIN telemetry_laps tl ON tp.id = tl.participant_id
                GROUP BY d.id
            ) as driver_lap_counts
        `;
        
        const avgPosResult = await avgPositionsPerDriver;
        const avgLapResult = await avgLapsPerDriver;
        
        console.log(`\nDurchschnittliche Positions-Datensätze pro Fahrer: ${avgPosResult[0].avg_positions_per_driver?.toFixed(2) || 0}`);
        console.log(`Durchschnittliche Runden pro Fahrer: ${avgLapResult[0].avg_laps_per_driver?.toFixed(2) || 0}`);
        
    } catch (err) {
        console.error("Fehler beim Abrufen der Statistiken:", err);
    }
}

getStats();