import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env Pfad: Ein Ordner über dem aktuellen Prozess
const envPath = path.join(process.cwd(), '..', '.env');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
    console.error(`❌ Kritisch: DATABASE_URL nicht gefunden in: ${envPath}`);
    process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Universelle Query-Funktion über den Pool.
 * Unterstützt Tagged Templates korrekt mit Platzhaltern ($1, $2, etc.).
 */
export async function query<T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T[]> {
    try {
        if (typeof strings === 'string') {
            const res = await pool.query(strings, values[0] || []);
            return res.rows;
        } else {
            // Umwandlung von Tagged Template zu $1, $2, ... Query
            let queryStr = strings[0];
            for (let i = 0; i < values.length; i++) {
                queryStr += `$${i + 1}${strings[i + 1]}`;
            }
            const res = await pool.query(queryStr, values);
            return res.rows as T[];
        }
    } catch (e: any) {
        // Wir fangen DB-Fehler hier ab und werfen sie nach oben weiter
        throw new Error(`DB-Fehler: ${e.message}`);
    }
}

export default pool;
