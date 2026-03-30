import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
    const sql = neon(process.env.DATABASE_URL!);
    console.log("Dropping password columns from leagues...");
    try {
        await sql`ALTER TABLE leagues DROP COLUMN IF EXISTS admin_password, DROP COLUMN IF EXISTS join_password;`;
        console.log("Columns dropped successfully.");
    } catch (e) {
        console.error("Error dropping columns:", e);
    }
}
main();
