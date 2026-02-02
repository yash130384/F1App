import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT UNIQUE NOT NULL,
    admin_password TEXT NOT NULL,
    join_password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    team TEXT,
    total_points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    track TEXT,
    race_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_finished BOOLEAN DEFAULT 1,
    scheduled_date TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS race_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    race_id TEXT,
    driver_id TEXT,
    position INTEGER NOT NULL,
    fastest_lap BOOLEAN DEFAULT 0,
    clean_driver BOOLEAN DEFAULT 0,
    points_earned INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS points_config (
    league_id TEXT PRIMARY KEY,
    points_json TEXT NOT NULL, -- JSON object for positions 1-20
    fastest_lap_bonus INTEGER DEFAULT 2,
    clean_driver_bonus INTEGER DEFAULT 3,
    FOREIGN KEY(league_id) REFERENCES leagues(id)
  );
`);

/**
 * Runs a query and returns results as an array.
 */
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

/**
 * Runs a command (INSERT/UPDATE/DELETE).
 */
export async function run(sql: string, params: any[] = []): Promise<void> {
  const stmt = db.prepare(sql);
  stmt.run(...params);
}
