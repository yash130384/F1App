import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function findKleosa() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const leagues = await sql`SELECT id, name FROM leagues WHERE name ILIKE '%Kleosa%'`;
        console.table(leagues);
        
        if (leagues.length > 0) {
            const lid = leagues[0].id;
            console.log(`Rennen für Liga ${leagues[0].name} (${lid}):`);
            const races = await sql`SELECT id, track, race_date, is_finished FROM races WHERE league_id = ${lid} ORDER BY race_date ASC`;
            console.table(races);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

findKleosa();
