import Database from 'better-sqlite3';
const db = new Database('./league.db');

const existingTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
);

const sessions = db.prepare(
  "SELECT id FROM telemetry_sessions WHERE race_id IS NULL"
).all();

const ids = sessions.map(s => s.id);
console.log('Lösche Sessions:', ids);

const tryDelete = (sql, params) => {
  try { db.prepare(sql).run(...params); } catch(e) { /* Tabelle existiert nicht, skip */ }
};

const del = db.transaction(() => {
  for (const id of ids) {
    tryDelete("DELETE FROM telemetry_lap_samples WHERE lap_id IN (SELECT id FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?))", [id]);
    tryDelete("DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?)", [id]);
    tryDelete("DELETE FROM telemetry_car_setups WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?)", [id]);
    tryDelete("DELETE FROM telemetry_tyre_sets WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?)", [id]);
    tryDelete("DELETE FROM telemetry_participants WHERE session_id = ?", [id]);
    tryDelete("DELETE FROM telemetry_safety_car_events WHERE session_id = ?", [id]);
    tryDelete("DELETE FROM telemetry_incidents WHERE session_id = ?", [id]);
    tryDelete("DELETE FROM telemetry_speed_traps WHERE session_id = ?", [id]);
    tryDelete("DELETE FROM telemetry_position_history WHERE session_id = ?", [id]);
    tryDelete("DELETE FROM telemetry_track_metadata WHERE track_id IN (SELECT track_id FROM telemetry_sessions WHERE id = ?)", [id]);
    db.prepare("DELETE FROM telemetry_sessions WHERE id = ?").run(id);
    console.log('  ✓ Gelöscht:', id);
  }
});

del();
const remaining = db.prepare("SELECT COUNT(*) as c FROM telemetry_sessions").get();
console.log('Fertig. Verbleibende Sessions in DB:', remaining.c);
