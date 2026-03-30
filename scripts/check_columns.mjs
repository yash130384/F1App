import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkColumns() {
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'telemetry_participants'
        `;
        console.table(columns);
    } catch (e) {
        console.error(e);
    }
}

checkColumns();
