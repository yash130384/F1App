import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

dotenv.config();

const USE_SQLITE = process.env.USE_SQLITE === 'true';
const sqlite = USE_SQLITE ? new Database('league.db') : null;

// Standard PostgreSQL driver behavior: return result object with .rows
const sql = !USE_SQLITE ? neon(process.env.DATABASE_URL!, { fullResults: true }) : null;

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
    car_index INTEGER,
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
  `ALTER TABLE telemetry_participants ADD COLUMN IF NOT EXISTS car_index INTEGER`,
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
  `ALTER TABLE telemetry_sessions ADD COLUMN IF NOT EXISTS track_flags INTEGER DEFAULT 0`,
  `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS game_name TEXT`,
  `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#ffffff'`,
  `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS raw_points INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS telemetry_lap_samples (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    lap_id TEXT UNIQUE NOT NULL,
    samples_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

const initSchema = async (retries = 3) => {
  if (USE_SQLITE) {
    console.log('Initializing SQLite Schema (Synchronous)...');
    for (const cmd of SCHEMA) {
      try {
        // Simple conversion for SQLite
        let sCmd = cmd.replace(/DEFAULT gen_random_uuid\(\)/g, "DEFAULT (lower(hex(randomblob(16))))");
        sCmd = sCmd.replace(/gen_random_uuid\(\)/g, "lower(hex(randomblob(16)))");
        sCmd = sCmd.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, "DATETIME DEFAULT CURRENT_TIMESTAMP");
        sCmd = sCmd.replace(/SERIAL PRIMARY KEY/g, "INTEGER PRIMARY KEY AUTOINCREMENT");
        sCmd = sCmd.replace(/VARCHAR\(\d+\)/g, "TEXT");
        sCmd = sCmd.replace(/BOOLEAN/g, "INTEGER");
        sCmd = sCmd.replace(/ILIKE/g, "LIKE");
        sCmd = sCmd.replace(/ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+) (\w+)( DEFAULT .*)?/g, (match, table, col, type, def) => {
          try {
            const info = sqlite?.prepare(`PRAGMA table_info(${table})`).all();
            const exists = (info as any[]).some(c => c.name === col);
            if (!exists) {
              return `ALTER TABLE ${table} ADD COLUMN ${col} ${type}${def || ''}`;
            }
          } catch (e) {}
          return '-- column exists';
        });
        
        if (sCmd.startsWith('--')) continue;
        sqlite?.exec(sCmd);
      } catch (err: any) {
        if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
           console.warn('SQLite Schema Command Error:', err.message, 'in', cmd.substring(0, 50));
        }
      }
    }
    console.log('SQLite Schema Initialized.');
    return;
  }

  console.log(`Synchronizing Schema with Neon (Attempt ${4 - retries}/3)...`);
  try {
    for (const cmd of SCHEMA) {
      await sql!.query(cmd);
    }
    console.log('Schema Sync Successful.');
  } catch (err: any) {
    if (retries > 1 && (err.message?.includes('ETIMEDOUT') || err.message?.includes('fetch failed'))) {
      console.warn('Schema Sync Timeout, retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return initSchema(retries - 1);
    }
    console.error('Schema Sync Error:', err);
  }
};

// Auto-init schema
if (process.env.NODE_ENV !== 'test') {
    // For SQLite we start synchronously to avoid race conditions
    if (USE_SQLITE) {
        initSchema();
    } else {
        initSchema().catch(console.error);
    }
}

/**
 * Runs a query and returns results as an array.
 */
export async function query<T>(sqlStr: string, params: any[] = [], retries = 2): Promise<T[]> {
  if (USE_SQLITE) {
    try {
      let sSql = sqlStr.replace(/ILIKE/g, 'LIKE');
      sSql = sSql.replace(/gen_random_uuid\(\)/g, "lower(hex(randomblob(16)))");
      sSql = sSql.replace(/NOW\(\) - INTERVAL '(\d+) minutes'/g, "datetime('now', '-$1 minutes')");
      // basic RETURNING id support for some SQLite versions
      if (!sSql.toLowerCase().includes('returning') && sSql.toLowerCase().includes('insert into')) {
          // If we need ID back and it's not there, it might be tricky, 
          // but usually it's there in the SCHEMA for these tables.
      }

      // Sanitize params
      const sParams = params.map(p => {
          if (p === undefined) return null;
          if (typeof p === 'boolean') return p ? 1 : 0;
          return p;
      });
      
      const stmt = sqlite?.prepare(sSql);
      return stmt?.all(...sParams) as T[];
    } catch (err) {
      console.error('SQLite Query Error for:', sqlStr, err);
      throw err;
    }
  }

  // Convert ? to $1, $2, etc.
  let pSql = sqlStr;
  const pParams = [...params];

  // Simple replacement: find all '?' and replace with $1, $2, etc.
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);

  // SQLite compatibility fixes
  pSql = pSql.replace('lower(hex(randomblob(16)))', 'gen_random_uuid()');
  pSql = pSql.replace(/INSERT OR REPLACE/gi, 'INSERT');

  try {
    const results = await sql!.query(pSql, pParams);
    return results.rows as T[];
  } catch (err: any) {
    if (retries > 0 && (err.message?.includes('ETIMEDOUT') || err.message?.includes('fetch failed'))) {
      console.warn(`Query timeout, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return query(sqlStr, params, retries - 1);
    }
    throw err;
  }
}

/**
 * Runs a command (INSERT/UPDATE/DELETE).
 */
export async function run(sqlStr: string, params: any[] = [], retries = 2): Promise<void> {
  if (USE_SQLITE) {
    try {
      let sSql = sqlStr.replace(/ILIKE/g, 'LIKE');
      sSql = sSql.replace(/gen_random_uuid\(\)/g, "lower(hex(randomblob(16)))");
      
      const sParams = params.map(p => {
          if (p === undefined) return null;
          if (typeof p === 'boolean') return p ? 1 : 0;
          return p;
      });

      const stmt = sqlite?.prepare(sSql);
      stmt?.run(...sParams);
      return;
    } catch (err) {
      console.error('SQLite Run Error for:', sqlStr, err);
      throw err;
    }
  }

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

  try {
    await sql!.query(pSql, pParams);
  } catch (err: any) {
    if (retries > 0 && (err.message?.includes('ETIMEDOUT') || err.message?.includes('fetch failed'))) {
      console.warn(`Run timeout, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return run(sqlStr, params, retries - 1);
    }
    throw err;
  }
}
