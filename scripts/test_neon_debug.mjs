import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = "postgresql://neondb_owner:npg_CjVQRk2Ksl6B@ep-green-mode-aim4s8n8-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function test() {
    console.log('Testing Neon connection...');
    try {
        const sql = neon(url);
        const result = await sql.query('SELECT NOW()');
        console.log('Result object:', JSON.stringify(result).substring(0, 500));

        const tables = await sql.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:', tables.rows ? tables.rows.map(t => t.table_name) : 'no rows');
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

test();
