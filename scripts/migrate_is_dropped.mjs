import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function migrate() {
    console.log("Starting migration...");
    const sql = neon(process.env.DATABASE_URL);

    try {
        await sql`ALTER TABLE race_results ADD COLUMN is_dropped BOOLEAN DEFAULT false;`;
        console.log("Added is_dropped to race_results");
    } catch (e) {
        if (e.message.includes('already exists')) {
            console.log("Column is_dropped already exists in race_results, skipping...");
        } else {
            console.error("Error adding is_dropped to race_results:", e);
        }
    }

    console.log("Migration completed successfully.");
}

migrate().catch(console.error);
