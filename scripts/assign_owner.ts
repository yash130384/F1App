import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
    const sql = neon(process.env.DATABASE_URL!);
    console.log("Assigning Kleosa Season1 to Markus Lanz...");
    
    try {
        const users = await sql`SELECT id FROM users WHERE username = 'Markus Lanz' OR username = 'markuslanz' OR email = 'test_markuslanz@test.de' LIMIT 1;`;
        if (users.length === 0) {
            console.error("Could not find user Markus Lanz!");
            return;
        }
        const userId = users[0].id;
        console.log("Found User ID:", userId);

        const result = await sql`UPDATE leagues SET owner_id = ${userId} WHERE name = 'Kleosa Season1';`;
        console.log("Assigned owner_id successfully.");
    } catch (e) {
        console.error("Error migrating owner:", e);
    }
}
main();
