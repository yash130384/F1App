import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

/**
 * Datenbank-Initialisierung via Drizzle ORM.
 * Nutzt Neon (PostgreSQL) als Hauptdatenbank.
 */

// Neon Client (PG)
const dbUrl = process.env.DATABASE_URL || 'postgres://placeholder_for_build:placeholder@localhost/db';
const sqlConnection = neon(dbUrl);
export const db = drizzle(sqlConnection, { schema });

/**
 * Abwärtskompatible query-Funktion für bestehende API-Aufrufe.
 */
export async function query<T>(sqlStr: string, params: any[] = []): Promise<T[]> {
  // PostgreSQL (Neon)
  let pSql = sqlStr;
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);
  
  // Drizzle/Neon Migration Fixes
  pSql = pSql.replace('lower(hex(randomblob(16)))', 'gen_random_uuid()');

  try {
    // 30s Timeout-Puffer für Neon-Abfragen
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Datenbank-Timeout (30s)')), 30000)
    );

    const result = await Promise.race([
        (sqlConnection as any).query(pSql, params),
        timeoutPromise
    ]);
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
  let pSql = sqlStr;
  let counter = 1;
  pSql = pSql.replace(/\?/g, () => `$${counter++}`);

  try {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Datenbank-Timeout (30s)')), 30000)
    );

    await Promise.race([
        (sqlConnection as any).query(pSql, params),
        timeoutPromise
    ]);
  } catch (err) {
    console.error('Neon Run Fehler:', err);
    throw err;
  }
}
