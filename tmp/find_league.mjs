import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function findLeague() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        console.log("Suchen nach 'Kleosa Season 1' in der Neon DB...");
        const leagues = await sql`SELECT id, name, slug FROM leagues WHERE name ILIKE '%Kleosa%' OR slug ILIKE '%kleosa%'`;
        console.table(leagues);
        
        if (leagues.length === 0) {
            console.log("Keine Liga gefunden. Liste alle Ligen auf:");
            const allLeagues = await sql`SELECT id, name, slug FROM leagues`;
            console.table(allLeagues);
        }
    } catch (err) {
        console.error("Fehler beim Abrufen der Ligen:", err);
    }
}

findLeague();
