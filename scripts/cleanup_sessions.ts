import { query, run } from '../src/lib/db';

async function cleanup() {
    try {
        const leagues = await query<any>('SELECT id, name FROM leagues WHERE name ILIKE ?', ['%Kleosa S2%']);
        
        if (leagues.length === 0) {
            console.log('❌ Liga "Kleosa S2" nicht gefunden.');
            return;
        }

        for (const league of leagues) {
            console.log(`\ud83d\uddd1\ufe0f L\u00f6sche Telemetrie-Sessions f\u00fcr "${league.name}" (${league.id})...`);
            
            // Kaskadierendes L\u00f6schen (die DB sollte Foreign Keys haben, aber zur Sicherheit...)
            // 1. Sessions l\u00f6schen (sollte alles andere mitnehmen, wenn ON DELETE CASCADE gesetzt ist)
            const res = await run('DELETE FROM telemetry_sessions WHERE league_id = ?', [league.id]);
            console.log(`✅ Fertig! Sessions gel\u00f6scht.`);
        }
    } catch (e) {
        console.error('❌ Fehler beim Cleanup:', e);
    }
    process.exit(0);
}

cleanup();
