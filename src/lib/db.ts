import { neon, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Standard PostgreSQL driver behavior: return result object with .rows
const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

// --- Schema Initialization ---
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT UNIQUE NOT NULL,
    admin_password TEXT NOT NULL,
    join_password TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    team TEXT,
    game_name TEXT,
    color TEXT DEFAULT '#ffffff',
    total_points INTEGER DEFAULT 0,
    raw_points INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    track TEXT,
    race_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_finished BOOLEAN DEFAULT true,
    scheduled_date TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS race_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id TEXT,
    driver_id TEXT,
    position INTEGER NOT NULL,
    quali_position INTEGER DEFAULT 0,
    fastest_lap BOOLEAN DEFAULT false,
    clean_driver BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    is_dnf BOOLEAN DEFAULT false,
    is_dropped BOOLEAN DEFAULT false
  )`,
  `ALTER TABLE race_results ADD COLUMN IF NOT EXISTS quali_position INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS points_config (
    league_id TEXT PRIMARY KEY,
    points_json TEXT NOT NULL,
    quali_points_json TEXT DEFAULT '{}',
    fastest_lap_bonus INTEGER DEFAULT 2,
    clean_driver_bonus INTEGER DEFAULT 3,
    total_races INTEGER DEFAULT 0,
    track_pool TEXT DEFAULT '[]',
    drop_results_count INTEGER DEFAULT 0
  )`,
  `ALTER TABLE points_config ADD COLUMN IF NOT EXISTS quali_points_json TEXT DEFAULT '{}'`,
  `CREATE TABLE IF NOT EXISTS telemetry_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id TEXT NOT NULL,
    race_id TEXT,
    track_id INTEGER,
    track_length INTEGER,
    session_type TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    driver_id TEXT,
    game_name TEXT NOT NULL,
    team_id INTEGER,
    start_position INTEGER,
    position INTEGER,
    lap_distance REAL,
    top_speed REAL,
    is_human BOOLEAN DEFAULT false,
    UNIQUE(session_id, game_name)
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_laps (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id TEXT NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time_ms INTEGER NOT NULL,
    is_valid BOOLEAN DEFAULT true
  )`,
  `ALTER TABLE race_results ADD COLUMN IF NOT EXISTS pit_stops INTEGER DEFAULT 0`,
  `ALTER TABLE race_results ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0`,
  `ALTER TABLE race_results ADD COLUMN IF NOT EXISTS penalties_time INTEGER DEFAULT 0`,
  `ALTER TABLE telemetry_participants ADD COLUMN IF NOT EXISTS pit_stops INTEGER DEFAULT 0`,
  `ALTER TABLE telemetry_participants ADD COLUMN IF NOT EXISTS warnings INTEGER DEFAULT 0`,
  `ALTER TABLE telemetry_participants ADD COLUMN IF NOT EXISTS penalties_time INTEGER DEFAULT 0`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS tyre_compound INTEGER`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS is_pit_lap BOOLEAN DEFAULT false`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS sector1_ms INTEGER`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS sector2_ms INTEGER`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS sector3_ms INTEGER`,
  `ALTER TABLE telemetry_laps ADD COLUMN IF NOT EXISTS car_damage_json TEXT`,
  `CREATE TABLE IF NOT EXISTS telemetry_safety_car_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    safety_car_type INTEGER NOT NULL,
    event_type INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_position_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    car_index INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    position INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_incidents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    details TEXT NOT NULL,
    vehicle_idx INTEGER,
    other_vehicle_idx INTEGER,
    lap_num INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_stints (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id TEXT NOT NULL,
    stint_number INTEGER NOT NULL,
    tyre_compound INTEGER NOT NULL,
    visual_compound INTEGER NOT NULL,
    start_lap INTEGER NOT NULL,
    end_lap INTEGER,
    tyre_age_at_start INTEGER DEFAULT 0
  )`,
  `ALTER TABLE telemetry_sessions ADD COLUMN IF NOT EXISTS track_flags INTEGER DEFAULT 0`
];

const initSchema = async () => {
  console.log('Synchronizing Schema with Neon...');
  try {
    for (const cmd of SCHEMA) {
      await sql.query(cmd);
    }
  } catch (err) {
    console.error('Schema Sync Error:', err);
  }
};

// Auto-init schema (Vercel will run this on first usage)
initSchema().catch(console.error);

/**
 * Runs a query and returns results as an array.
 */
export async function query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
  // Convert ? to $1, $2, etc.
  let pSql = sqlStr;
  const pParams = [...params];

  // Simple replacement: find all '?' and replace with $1, $2, etc.
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);

  // SQLite compatibility fixes
  pSql = pSql.replace('lower(hex(randomblob(16)))', 'gen_random_uuid()');
  pSql = pSql.replace(/INSERT OR REPLACE/gi, 'INSERT');

  const results = await sql.query(pSql, pParams);
  return results.rows as T[];
}

/**
 * Runs a command (INSERT/UPDATE/DELETE).
 */
export async function run(sqlStr: string, params: any[] = []): Promise<void> {
  let pSql = sqlStr;
  const pParams = [...params];

  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);

  // SQLite compatibility fixes
  pSql = pSql.replace(/INSERT OR REPLACE/gi, 'INSERT');

  // Special handling for points_config upsert
  if (sqlStr.toLowerCase().includes('into points_config')) {
    pSql += ' ON CONFLICT (league_id) DO UPDATE SET points_json = EXCLUDED.points_json, fastest_lap_bonus = EXCLUDED.fastest_lap_bonus, clean_driver_bonus = EXCLUDED.clean_driver_bonus, total_races = EXCLUDED.total_races, track_pool = EXCLUDED.track_pool, drop_results_count = EXCLUDED.drop_results_count';
  }

  await sql.query(pSql, pParams);
}
