import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function exploreDB() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        console.log("Listing tables...");
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.table(tables);
        
        for (const table of tables) {
            console.log(`Checking table: ${table.table_name}`);
            const columns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${table.table_name}`;
            console.log(`Columns for ${table.table_name}: ${columns.map(c => c.column_name).join(', ')}`);
        }
    } catch (err) {
        console.error("Error exploring DB:", err);
    }
}

exploreDB();
