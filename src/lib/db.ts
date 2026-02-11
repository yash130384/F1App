import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isPostgres = true; // Forcing Postgres as requested

// --- Initialize Connections ---
let sql: any;
let db: any;

if (isPostgres) {
  sql = neon(process.env.DATABASE_URL!);
  console.log('Using Neon (PostgreSQL) - Permanent Setup');
} else {
  const DB_PATH = path.join(process.cwd(), 'league.db');
  db = new Database(DB_PATH);
  console.log('Using Local SQLite');
}

// --- Schema Initialization ---
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT UNIQUE NOT NULL,
    admin_password TEXT NOT NULL,
    join_password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    team TEXT,
    total_points INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY,
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    track TEXT,
    race_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_finished BOOLEAN DEFAULT true,
    scheduled_date TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS race_results (
    id TEXT PRIMARY KEY,
    race_id TEXT,
    driver_id TEXT,
    position INTEGER NOT NULL,
    fastest_lap BOOLEAN DEFAULT false,
    clean_driver BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    is_dnf BOOLEAN DEFAULT false
  );

  CREATE TABLE IF NOT EXISTS points_config (
    league_id TEXT PRIMARY KEY,
    points_json TEXT NOT NULL,
    fastest_lap_bonus INTEGER DEFAULT 2,
    clean_driver_bonus INTEGER DEFAULT 3
  );
`;

const initSchema = async () => {
  if (isPostgres) {
    // Postgres: Execute all at once
    await sql.query(SCHEMA);
  } else {
    // SQLite: Execute via exec
    db.exec(SCHEMA);
  }
};

// Auto-init schema if not on Vercel build time (optional, but convenient for dev)
if (process.env.NODE_ENV !== 'production' || !isPostgres) {
  initSchema().catch(console.error);
}

/**
 * Runs a query and returns results as an array.
 */
export async function query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
  if (isPostgres) {
    // Neon handles parameters via template tags or simple arrays
    // For simplicity with existing code, we use $1, $2, etc.
    let pSql = sqlStr;
    params.forEach((_, i) => {
      pSql = pSql.replace('?', `$${i + 1}`);
    });

    // Postgres specific fixes
    pSql = pSql.replace('lower(hex(randomblob(16)))', 'gen_random_uuid()');
    pSql = pSql.replace('INSERT OR REPLACE', 'INSERT'); // Handle separately if needed, but actions mostly use run()

    const results = await sql.query(pSql, params);
    return results.rows as T[];
  } else {
    const stmt = db.prepare(sqlStr);
    return stmt.all(...params) as T[];
  }
}

/**
 * Runs a command (INSERT/UPDATE/DELETE).
 */
export async function run(sqlStr: string, params: any[] = []): Promise<void> {
  if (isPostgres) {
    let pSql = sqlStr;
    params.forEach((_, i) => {
      pSql = pSql.replace('?', `$${i + 1}`);
    });

    // Better-sqlite3 compatibility layer
    pSql = pSql.replace('INSERT OR REPLACE', 'INSERT');
    if (sqlStr.includes('INSERT OR REPLACE INTO points_config')) {
      pSql += ' ON CONFLICT (league_id) DO UPDATE SET points_json = EXCLUDED.points_json, fastest_lap_bonus = EXCLUDED.fastest_lap_bonus, clean_driver_bonus = EXCLUDED.clean_driver_bonus';
    }

    await sql.query(pSql, params);
  } else {
    const stmt = db.prepare(sqlStr);
    stmt.run(...params);
  }
}
