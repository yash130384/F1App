import { createLeague, joinLeague, saveRaceResults } from '../src/lib/actions.ts';
import { query } from '../src/lib/db.ts';

async function verifyFix() {
    console.log('--- Verifying Standings Fix ---');
    const leagueName = `FixVerifyFinal ${Date.now()}`;

    // 1. Create League
    console.log('1. Creating league...');
    await createLeague(leagueName, 'admin', 'join');
    const leagues = await query('SELECT id FROM leagues WHERE name = ?', [leagueName]);
    const leagueId = leagues[0].id;

    // 2. Join Driver
    console.log('2. Driver joining...');
    await joinLeague(leagueName, 'join', 'Verify Driver', 'Verify Team');
    const drivers = await query('SELECT id, total_points FROM drivers WHERE league_id = ?', [leagueId]);
    const driverId = drivers[0].id;
    console.log('Driver initial points:', drivers[0].total_points);

    // 3. Save Race Results
    console.log('3. Saving race results...');
    const results = [
        { driver_id: driverId, position: 1, fastest_lap: true, clean_driver: true }
    ];
    await saveRaceResults(leagueId, 'Verify Track', results);

    // 4. Verify Points
    const updatedDrivers = await query('SELECT id, total_points FROM drivers WHERE id = ?', [driverId]);
    console.log('Driver points after race:', updatedDrivers[0].total_points);

    if (updatedDrivers[0].total_points > 0) {
        console.log('FIX VERIFIED: Driver points are now correctly updated!');
    } else {
        console.log('FIX FAILED: Driver points are still 0!');
        process.exit(1);
    }
}

verifyFix().catch(err => {
    console.error(err);
    process.exit(1);
});
