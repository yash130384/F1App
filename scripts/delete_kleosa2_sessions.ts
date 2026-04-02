import { query, run } from '../src/lib/db';

/**
 * DB-Monkey Cleanup Script
 * Fokus: Speicheroptimierung & Konsistenz
 * 
 * Löscht alle Telemetrie-Daten für "Kleosa S2".
 * Wichtig: telemetry_lap_samples wird explizit gelöscht, da hier kein Cascade-Delete greift.
 */
async function performCleanup() {
    console.log('--- DB-Monkey: Kleosa S2 Cleanup gestartet ---');

    try {
        // 1. Liga-ID finden
        const leagues = await query<{id: string, name: string}>(
            'SELECT id, name FROM leagues WHERE name ILIKE ?', 
            ['%Kleosa S2%']
        );

        if (leagues.length === 0) {
            console.log('❌ Keine Liga mit dem Namen "Kleosa S2" gefunden.');
            return;
        }

        for (const league of leagues) {
            console.log(`\nProcessing League: ${league.name} (${league.id})`);

            // Schritt A: Samples löschen (Speicherfresser!)
            // Diese Tabelle hat laut schema.ts keinen FK-Cascade, daher manueller Join nötig.
            console.log('Step 1: Lösche speicherintensive Lap-Samples...');
            const sampleResult = await run(`
                DELETE FROM telemetry_lap_samples 
                WHERE lap_id IN (
                    SELECT l.id 
                    FROM telemetry_laps l
                    JOIN telemetry_participants p ON l.participant_id = p.id
                    JOIN telemetry_sessions s ON p.session_id = s.id
                    WHERE s.league_id = ?
                )
            `, [league.id]);
            console.log(`✅ Lap-Samples entfernt.`);

            // Schritt B: Sessions löschen
            // Dies triggert den DB-seitigen CASCADE für:
            // - telemetry_participants
            // - telemetry_laps
            // - telemetry_stints
            // - telemetry_position_history
            // - telemetry_incidents
            // - telemetry_safety_car_events
            console.log('Step 2: Lösche Telemetrie-Sessions (Kaskadierend)...');
            await run('DELETE FROM telemetry_sessions WHERE league_id = ?', [league.id]);
            console.log(`✅ Alle kaskadierenden Telemetrie-Daten für "${league.name}" gelöscht.`);
        }

        console.log('\n--- Cleanup erfolgreich abgeschlossen ---');
    } catch (error) {
        console.error('\n❌ Schwerwiegender Fehler beim Cleanup:', error);
    } finally {
        process.exit(0);
    }
}

performCleanup();
