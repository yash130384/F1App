import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';

dotenv.config();

const USE_SQLITE = process.env.USE_SQLITE === 'true';
const DATABASE_URL = process.env.DATABASE_URL;

async function cleanup() {
  console.log(`\ud83d\udd0d Suche nach Liga "Kleosa S2" (Modus: ${USE_SQLITE ? 'SQLite' : 'Postgres'})...`);

  let leagueId: string | null = null;

  if (USE_SQLITE) {
    const db = new Database('league.db');
    const row = db.prepare("SELECT id FROM leagues WHERE name LIKE '%Kleosa S2%'").get() as any;
    if (row) leagueId = row.id;
    
    if (leagueId) {
      console.log(`\u2705 Liga gefunden: ${leagueId}. L\u00f6sche Sessions...`);
      const result = db.prepare("DELETE FROM telemetry_sessions WHERE league_id = ?").run(leagueId);
      console.log(`\ud83d\uddd1\ufe0f Fertig! ${result.changes} Sessions gel\u00f6scht.`);
    }
  } else {
    const sql = neon(DATABASE_URL!);
    const leagues = await (sql as any).query("SELECT id FROM leagues WHERE name ILIKE $1", ['%Kleosa S2%']);
    if (leagues.length > 0) leagueId = leagues[0].id;

    if (leagueId) {
      console.log(`\u2705 Liga gefunden: ${leagueId}. L\u00f6sche Sessions...`);
      // Neon/Drizzle Cascade sollte greifen
      await (sql as any).query("DELETE FROM telemetry_sessions WHERE league_id = $1", [leagueId]);
      console.log(`\ud83d\uddd1\ufe0f Fertig! Alle Sessions f\u00fcr Kleosa S2 wurden entfernt.`);
    }
  }

  if (!leagueId) {
    console.log('\u274c Liga "Kleosa S2" konnte nicht gefunden werden.');
  }
}

cleanup().catch(console.error);
