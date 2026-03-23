import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        const sessionId = '4dffc8f8-c650-441d-addb-eb9eac327fdc';
        
        console.log(`Lösche fehlerhafte Session: ${sessionId}`);
        
        // Lösche abhängige Daten
        await sql`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sessionId})`;
        await sql`DELETE FROM telemetry_position_history WHERE session_id = ${sessionId}`;
        await sql`DELETE FROM telemetry_participants WHERE session_id = ${sessionId}`;
        await sql`DELETE FROM telemetry_sessions WHERE id = ${sessionId}`;
        
        console.log('Bereinigung erfolgreich.');
    } catch (err) {
        console.error("Error:", err);
    }
}

cleanup();
