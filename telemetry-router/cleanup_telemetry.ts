import { query } from './src/db';

async function cleanupKleosaS2() {
    console.log('--- Telemetrie-Aufräumaktion für Kleosa S2 ---');
    try {
        // Suche nach der Liga
        const leagues = await query`SELECT id, name FROM leagues WHERE name ILIKE '%Kleosa S2%'`;
        
        if (leagues.length === 0) {
            console.log('❌ Keine Liga mit dem Namen "Kleosa S2" gefunden.');
            return;
        }

        const leagueId = leagues[0].id;
        const leagueName = leagues[0].name;
        console.log(`✅ Liga gefunden: ${leagueName} (ID: ${leagueId})`);

        // Sessions finden
        const sessions = await query`SELECT id FROM telemetry_sessions WHERE league_id = ${leagueId}`;
        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length > 0) {
            console.log(`Lösche Daten für ${sessionIds.length} Sessions...`);

            // Wir nutzen die Tagged Templates (Backticks direkt nach query) für alle Löschvorgänge
            // Da Postgres ANY($1) erwartet, müssen wir das Array übergeben
            
            console.log(' - Proben...');
            await query(`DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT id FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1)))`, [sessionIds]);
            
            console.log(' - Runden...');
            await query(`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ANY($1))`, [sessionIds]);
            
            console.log(' - Positionshistorie...');
            await query(`DELETE FROM telemetry_position_history WHERE session_id = ANY($1)`, [sessionIds]);
            
            console.log(' - Teilnehmer...');
            await query(`DELETE FROM telemetry_participants WHERE session_id = ANY($1)`, [sessionIds]);
            
            console.log(' - Sessions...');
            await query`DELETE FROM telemetry_sessions WHERE league_id = ${leagueId}`;
            
            console.log(`\n🎉 Sauber! Alle Telemetrie-Dateien für ${leagueName} wurden entfernt.\n`);
        } else {
            console.log('Keine Session-Daten vorhanden.');
        }

    } catch (err) {
        console.error('❌ Fehler beim Aufräumen:', err);
    } finally {
        process.exit(0);
    }
}

cleanupKleosaS2();
