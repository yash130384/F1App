import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

console.log('--- Database Migration ---');
try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS points_config (
            league_id TEXT PRIMARY KEY,
            points_json TEXT NOT NULL,
            fastest_lap_bonus INTEGER DEFAULT 2,
            clean_driver_bonus INTEGER DEFAULT 3,
            FOREIGN KEY(league_id) REFERENCES leagues(id)
        )
    `).run();
    console.log('SUCCESS: points_config table ensured.');
} catch (err) {
    console.error('Migration failed:', err.message);
}
