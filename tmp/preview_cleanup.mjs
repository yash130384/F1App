import Database from 'better-sqlite3';
const db = new Database('./league.db');

const toDelete = db.prepare(
  "SELECT id, league_id, race_id, session_type, track_id, created_at FROM telemetry_sessions WHERE race_id IS NULL ORDER BY created_at DESC"
).all();

console.log('=== Sessions ohne race_id ===');
toDelete.forEach(s => console.log(s.id, '|', s.league_id, '|', s.session_type, '|', s.created_at));
console.log('Anzahl zum Löschen:', toDelete.length);

const total = db.prepare('SELECT COUNT(*) as c FROM telemetry_sessions').get();
console.log('Gesamt in DB:', total.c);
