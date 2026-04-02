import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function cleanup() {
    const leagueName = 'Kleosa S2';
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) process.exit(1);

    const sql = neon(dbUrl);
    try {
        // Suche über ID (als Text gecastet) oder Name
        const leagues = await sql.query('SELECT id FROM leagues WHERE id::text = $1 OR name = $1', [leagueName]);
        if (leagues.length === 0) {
            console.log(`Liga ${leagueName} nicht gefunden.`);
            process.exit(0);
        }
        
        const leagueId = leagues[0].id;
        console.log(`\n🧹 Starte Tiefenreinigung für Liga: ${leagueId} (${leagueName})`);

        // 1. Hole alle betroffenen Sessions
        const sessions = await sql.query('SELECT id FROM telemetry_sessions WHERE league_id = $1', [leagueId]);
        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length === 0) {
            console.log('Keine Sessions zum Löschen gefunden.');
            process.exit(0);
        }

        console.log(`Lösche Daten für ${sessionIds.length} Sessions...`);

        // 2. Hole alle Teilnehmer dieser Sessions
        const participants = await sql.query('SELECT id FROM telemetry_participants WHERE session_id = ANY($1)', [sessionIds]);
        const participantIds = participants.map(p => p.id);

        if (participantIds.length > 0) {
            // 3. Hole alle Runden dieser Teilnehmer
            const laps = await sql.query('SELECT id FROM telemetry_laps WHERE participant_id = ANY($1)', [participantIds]);
            const lapIds = laps.map(l => l.id);

            if (lapIds.length > 0) {
                console.log(`Lösche ${lapIds.length} Runden-Samples...`);
                try { await sql.query('DELETE FROM telemetry_lap_samples WHERE lap_id = ANY($1)', [lapIds]); } catch (e) {}
                console.log(`Lösche ${lapIds.length} Runden...`);
                try { await sql.query('DELETE FROM telemetry_laps WHERE id = ANY($1)', [lapIds]); } catch (e) {}
            }

            console.log('Lösche Metadaten (Setup, Speedtraps, Tyres)...');
            try { await sql.query('DELETE FROM telemetry_car_setups WHERE participant_id = ANY($1)', [participantIds]); } catch (e) {}
            try { await sql.query('DELETE FROM telemetry_speed_traps WHERE participant_id = ANY($1)', [participantIds]); } catch (e) {}
            try { await sql.query('DELETE FROM telemetry_tyre_sets WHERE participant_id = ANY($1)', [participantIds]); } catch (e) {}
            
            console.log('Lösche Teilnehmer-Datensätze...');
            try { await sql.query('DELETE FROM telemetry_participants WHERE id = ANY($1)', [participantIds]); } catch (e) {}
        }

        console.log('Lösche Session-Events (Safety Car, Incidents, Positions)...');
        try { await sql.query('DELETE FROM telemetry_safety_car_events WHERE session_id = ANY($1)', [sessionIds]); } catch (e) {}
        try { await sql.query('DELETE FROM telemetry_incidents WHERE session_id = ANY($1)', [sessionIds]); } catch (e) {}
        try { await sql.query('DELETE FROM telemetry_position_history WHERE session_id = ANY($1)', [sessionIds]); } catch (e) {}

        console.log('Lösche Sessions selbst...');
        try { await sql.query('DELETE FROM telemetry_sessions WHERE id = ANY($1)', [sessionIds]); } catch (e) {}

        console.log('✨ Tabula Rasa abgeschlossen.');
        process.exit(0);
    } catch (e) {
        console.error('CRITICAL CLEANUP ERROR', e);
        process.exit(1);
    }
}
cleanup();
