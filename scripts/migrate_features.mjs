import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
    console.log('Starting migration...');
    try {
        await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS raw_points INTEGER DEFAULT 0`;
        console.log('Added raw_points to drivers');

        // Ensure raw_points equals total_points for existing drivers initially
        await sql`UPDATE drivers SET raw_points = total_points WHERE raw_points = 0 AND total_points > 0`;

        await sql`ALTER TABLE points_config ADD COLUMN IF NOT EXISTS total_races INTEGER DEFAULT 0`;
        await sql`ALTER TABLE points_config ADD COLUMN IF NOT EXISTS track_pool TEXT DEFAULT '[]'`;
        await sql`ALTER TABLE points_config ADD COLUMN IF NOT EXISTS drop_results_count INTEGER DEFAULT 0`;
        console.log('Added new columns to points_config');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
