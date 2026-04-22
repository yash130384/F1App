import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupAllUnassigned() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        console.log("Suche nach Sessions ohne race_id...");
        const sessions = await sql`SELECT id FROM telemetry_sessions WHERE race_id IS NULL`;
        
        if (sessions.length === 0) {
            console.log("Keine unzugewiesenen Sessions gefunden.");
            return;
        }

        console.log(`Lösche ${sessions.length} unzugewiesene Sessions...`);
        for (const session of sessions) {
            const sid = session.id;
            console.log(`Löschvorgang für: ${sid}`);
            
            try { await sql`DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT id FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid}))`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid})`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_car_setups WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid})`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_tyre_sets WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${sid})`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_participants WHERE session_id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_safety_car_events WHERE session_id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_incidents WHERE session_id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_speed_traps WHERE session_id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_position_history WHERE session_id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_track_metadata WHERE track_id IN (SELECT track_id FROM telemetry_sessions WHERE id = ${sid})`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
            try { await sql`DELETE FROM telemetry_sessions WHERE id = ${sid}`; } catch (e) { if (e.code !== '42P01') console.error(e.message); }
        }
        
        console.log('Alle unzugewiesenen Sessions (ohne race_id) in Neon DB gelöscht.');
        const remaining = await sql`SELECT COUNT(*) as c FROM telemetry_sessions`;
        console.log('Verbleibende Sessions (mit race_id):', remaining[0].c);
    } catch (err) {
        console.error("Error:", err);
    }
}
cleanupAllUnassigned();
