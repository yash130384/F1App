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
    total_points INTEGER DEFAULT 0
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
    fastest_lap BOOLEAN DEFAULT false,
    clean_driver BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    is_dnf BOOLEAN DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS points_config (
    league_id TEXT PRIMARY KEY,
    points_json TEXT NOT NULL,
    fastest_lap_bonus INTEGER DEFAULT 2,
    clean_driver_bonus INTEGER DEFAULT 3
  )`
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
    pSql += ' ON CONFLICT (league_id) DO UPDATE SET points_json = EXCLUDED.points_json, fastest_lap_bonus = EXCLUDED.fastest_lap_bonus, clean_driver_bonus = EXCLUDED.clean_driver_bonus';
  }

  await sql.query(pSql, pParams);
}
