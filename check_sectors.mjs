import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkSectors() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Checking telemetry_laps for sector times...");
        
        // Count total laps vs laps with sector times
        const stats = await sql`
            SELECT 
                COUNT(*) as total_laps,
                SUM(CASE WHEN sector1_ms > 0 THEN 1 ELSE 0 END) as laps_with_s1,
                SUM(CASE WHEN sector2_ms > 0 THEN 1 ELSE 0 END) as laps_with_s2,
                SUM(CASE WHEN sector3_ms > 0 THEN 1 ELSE 0 END) as laps_with_s3
            FROM telemetry_laps
        `;
        
        console.log("Stats:");
        console.log(stats[0]);

        // Get 5 sample laps with sector times
        const samples = await sql`
            SELECT lap_number, lap_time_ms, sector1_ms, sector2_ms, sector3_ms
            FROM telemetry_laps
            WHERE sector1_ms > 0 AND sector2_ms > 0 AND sector3_ms > 0
            LIMIT 5
        `;

        if (samples.length > 0) {
            console.log("\nSample Data (Laps WITH sector times):");
            console.table(samples);
        } else {
            console.log("\nNo laps found with complete sector times (> 0).");
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkSectors();
