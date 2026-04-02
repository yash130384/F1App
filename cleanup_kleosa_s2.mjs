import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

/**
 * DB-MONKEY CLEANUP SCRIPT
 * Ziel: Vollständige Löschung aller Session-Daten für "Kleosa S2"
 */
async function cleanupKleosaS2() {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log("🐒 DB-Monkey startet Cleanup für 'Kleosa S2'...");

    try {
        // 1. Liga ID ermitteln
        const leagues = await sql`SELECT id, name FROM leagues WHERE name ILIKE '%Kleosa S2%'`;
        
        if (leagues.length === 0) {
            console.log("❌ Keine Liga mit 'Kleosa S2' gefunden. Abbruch.");
            return;
        }

        for (const league of leagues) {
            console.log(`\n📦 Verarbeite Liga: ${league.name} (${league.id})`);

            // 2. Speicherintensive Samples löschen
            // Wir müssen hier manuell ran, da kein FK-Cascade im Schema definiert ist.
            console.log("   --> Lösche Lap-Samples (Speicherfresser)...");
            const deletedSamples = await sql`
                DELETE FROM telemetry_lap_samples 
                WHERE lap_id IN (
                    SELECT l.id 
                    FROM telemetry_laps l
                    JOIN telemetry_participants p ON l.participant_id = p.id
                    JOIN telemetry_sessions s ON p.session_id = s.id
                    WHERE s.league_id = ${league.id}
                )
            `;
            console.log("   ✅ Samples bereinigt.");

            // 3. Telemetrie-Sessions löschen
            // Dies triggert den DB-seitigen CASCADE für: Teilnehmer, Runden, Stints, Positionshistorie etc.
            console.log("   --> Lösche Sessions (Kaskadierend)...");
            await sql`DELETE FROM telemetry_sessions WHERE league_id = ${league.id}`;
            
            console.log(`   ✅ Alle Session-Daten für '${league.name}' wurden entfernt.`);
        }

        console.log("\n✨ Cleanup erfolgreich beendet. Die Datenbank ist nun wieder sauber und performant.");

    } catch (err) {
        console.error("\n💥 Fehler beim Cleanup:", err);
    }
}

cleanupKleosaS2();
