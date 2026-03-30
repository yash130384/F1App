import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const USE_SQLITE = process.env.USE_SQLITE === 'true';

/**
 * Datenbank-Initialisierung via Drizzle ORM.
 * Unterstützt Neon (PostgreSQL) und SQLite.
 */

// Neon Client (PG)
const sqlConnection = !USE_SQLITE ? neon(process.env.DATABASE_URL!) : null;
export const dbNeon = sqlConnection ? drizzleNeon(sqlConnection, { schema }) : null;

// SQLite Client
const sqliteConnection = USE_SQLITE ? new Database('league.db') : null;
export const dbSqlite = sqliteConnection ? drizzleSqlite(sqliteConnection, { schema }) : null;

// Aktiver DB-Client (für Drizzle Abfragen)
export const db = USE_SQLITE ? dbSqlite! : dbNeon!;

/**
 * Abwärtskompatible query-Funktion für bestehende API-Aufrufe.
 */
export async function query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
  if (USE_SQLITE) {
    let sSql = sqlStr.replace(/ILIKE/g, 'LIKE');
    // UUID Generierung für SQLite
    sSql = sSql.replace(/gen_random_uuid\(\)/g, "lower(hex(randomblob(16)))");
    
    const sParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
    const stmt = sqliteConnection?.prepare(sSql);
    return stmt?.all(...sParams) as T[];
  }

  // PostgreSQL (Neon)
  let pSql = sqlStr;
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);
  
  // Drizzle/Neon Migration Fixes
  pSql = pSql.replace('lower(hex(randomblob(16)))', 'gen_random_uuid()');

  try {
    // Falls wir Neon nutzen, verwenden wir .query() f\u00fcr herk\u00f6mmliche Platzhalter-Abfragen ($1, $2).
    const result = await (sqlConnection as any).query(pSql, params);
    return result as T[];
  } catch (err) {
    console.error('Neon Query Fehler:', err);
    throw err;
  }
}

/**
 * Abwärtskompatible run-Funktion für INSERT/UPDATE/DELETE.
 */
export async function run(sqlStr: string, params: any[] = []): Promise<void> {
  if (USE_SQLITE) {
    let sSql = sqlStr.replace(/ILIKE/g, 'LIKE');
    sSql = sSql.replace(/gen_random_uuid\(\)/g, "lower(hex(randomblob(16)))");
    
    const sParams = params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p === undefined ? null : p));
    const stmt = sqliteConnection?.prepare(sSql);
    stmt?.run(...sParams);
    return;
  }

  let pSql = sqlStr;
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);

  try {
    await (sqlConnection as any).query(pSql, params);
  } catch (err) {
    console.error('Neon Run Fehler:', err);
    throw err;
  }
}
