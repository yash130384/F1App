import { query, run } from '../src/lib/db.ts';

async function test() {
    console.log('Testing query function...');
    try {
        const leagues = await query('SELECT * FROM leagues LIMIT 1');
        console.log('Leagues found:', leagues.length);
        if (leagues.length > 0) {
            console.log('First league:', leagues[0].name);
        }

        console.log('Testing run function...');
        // Just a simple select to test syntax conversion
        await run('SELECT 1');
        console.log('Run successful');

    } catch (err) {
        console.error('DB Action Test Failed:', err);
    }
}

test();
