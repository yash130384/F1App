import { query } from '../src/lib/db';

async function inspect() {
    console.log('--- Database Inspection ---');

    const leagues = await query<any>('SELECT id, name FROM leagues');
    console.log('LEAGUES:', JSON.stringify(leagues, null, 2));

    for (const l of leagues) {
        const races = await query<any>('SELECT id, track, is_finished, race_date, scheduled_date FROM races WHERE league_id = ?', [l.id]);
        console.log(`RACES for ${l.name}:`, JSON.stringify(races, null, 2));

        const drivers = await query<any>('SELECT id, name FROM drivers WHERE league_id = ?', [l.id]);
        console.log(`DRIVERS for ${l.name}:`, JSON.stringify(drivers, null, 2));
    }
}

inspect().catch(console.error);
