const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function assign() {
    try {
        console.log('Finding user Markus Lanz (test_markuslanz@test.de)...');
        const users = await sql`SELECT id FROM users WHERE email = 'test_markuslanz@test.de'`;
        if (users.length === 0) throw new Error('User Markus Lanz not found.');
        const userId = users[0].id;
        console.log('User ID:', userId);

        console.log('Finding league Kleosa Season1...');
        const leagues = await sql`SELECT id FROM leagues WHERE name = 'Kleosa Season1'`;
        if (leagues.length === 0) {
            console.log('League Kleosa Season1 not found. Assigning all leagues to Markus for testing?');
            // Or just fail. Let's fail if it's not there.
            throw new Error('League Kleosa Season1 not found.');
        }
        const leagueId = leagues[0].id;
        console.log('League ID:', leagueId);

        console.log('Updating league ownership...');
        await sql`UPDATE leagues SET owner_id = ${userId} WHERE id = ${leagueId}`;
        console.log('Success! League Kleosa Season1 is now owned by Markus Lanz.');

    } catch (e) {
        console.error('Error:', e.message);
    }
}
assign();
