import { query, run } from '../src/lib/db.ts';

async function cleanup() {
    console.log('--- Database Cleanup ---');

    // 1. Identify Test Leagues
    const testLeagues = await query<any>("SELECT id, name FROM leagues WHERE name LIKE 'RefactorTest%'");
    console.log(`Found ${testLeagues.length} test leagues to delete.`);

    for (const l of testLeagues) {
        console.log(`Deleting League: ${l.name} (${l.id})`);

        // Delete results
        const drivers = await query<any>('SELECT id FROM drivers WHERE league_id = ?', [l.id]);
        for (const d of drivers) {
            await run('DELETE FROM race_results WHERE driver_id = ?', [d.id]);
        }

        // Delete races
        await run('DELETE FROM races WHERE league_id = ?', [l.id]);

        // Delete drivers
        await run('DELETE FROM drivers WHERE league_id = ?', [l.id]);

        // Delete points config
        await run('DELETE FROM points_config WHERE league_id = ?', [l.id]);

        // Delete league itself
        await run('DELETE FROM leagues WHERE id = ?', [l.id]);
    }

    // 2. Cleanup Kleosa Season1
    const kleosa = await query<any>("SELECT id FROM leagues WHERE name = 'Kleosa Season1'");
    if (kleosa.length > 0) {
        const kId = kleosa[0].id;
        console.log(`Cleaning up Kleosa Season1 (${kId})...`);

        // Remove scheduled races
        const deletedScheduled = await run('DELETE FROM races WHERE league_id = ? AND is_finished = false', [kId]);
        console.log('Deleted scheduled races for Kleosa.');

        // Verify finished races
        const finished = await query<any>('SELECT id, track FROM races WHERE league_id = ? AND is_finished = true', [kId]);
        console.log('Finished races remaining for Kleosa:', finished);
    } else {
        console.log('Kleosa Season1 not found!');
    }

    console.log('--- Cleanup Complete ---');
}

cleanup().catch(console.error);
