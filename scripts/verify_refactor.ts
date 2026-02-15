import { createLeague, joinLeague, scheduleRace, saveRaceResults, getDashboardData, deleteScheduledRace } from '../src/lib/actions';
import { query } from '../src/lib/db';

async function testRefactor() {
    console.log('--- Testing Admin Refactor ---');

    // 1. Create a fresh league
    const leagueName = `RefactorTest ${Date.now()}`;
    const adminPass = 'admin123';
    const lRes = await createLeague(leagueName, adminPass, 'join');
    if (!lRes.success) throw new Error('League creation failed');
    const leagueId = lRes.leagueId;
    console.log(`Created league: ${leagueName} (${leagueId})`);

    // 2. Register a driver
    await joinLeague(leagueName, 'join', 'Test Driver', 'Test Team');

    // 3. Schedule a race
    const track = 'Monaco';
    const sRes = await scheduleRace(leagueId, track, new Date().toISOString(), adminPass);
    if (!sRes.success) throw new Error('Race scheduling failed');
    console.log('Race scheduled at Monaco');

    // 4. Save results for Monaco (without ID)
    const results = [{
        driverId: (await query<any>('SELECT id FROM drivers WHERE name = ?', ['Test Driver']))[0].id,
        position: 1,
        fastestLap: true,
        cleanDriver: true,
        isDnf: false
    }];

    console.log('Saving results for Monaco (should auto-link)...');
    const saveRes = await saveRaceResults(leagueId, track, results);
    if (!saveRes.success) throw new Error('Saving results failed: ' + saveRes.error);

    // 5. Verify database state
    const races = await query<any>('SELECT * FROM races WHERE league_id = ?', [leagueId]);
    console.log(`Found ${races.length} race(s) in DB for this league.`);

    const monaco = races.find(r => r.track === 'Monaco');
    if (monaco.is_finished) {
        console.log('SUCCESS: Scheduled race was automatically marked as finished.');
    } else {
        console.log('FAILURE: Scheduled race is still marked as planned.');
    }

    if (races.length === 1) {
        console.log('SUCCESS: No duplicate race created.');
    } else {
        console.log('FAILURE: Duplicate race created.');
    }

    // 6. Test deleteScheduledRace (requires another scheduled race)
    const track2 = 'Spa';
    await scheduleRace(leagueId, track2, new Date().toISOString(), adminPass);
    const spaRace = (await query<any>('SELECT id FROM races WHERE track = ? AND is_finished = false', [track2]))[0];

    console.log('Testing deleteScheduledRace for Spa...');
    const delRes = await deleteScheduledRace(spaRace.id, leagueId, adminPass);
    if (delRes.success) {
        console.log('SUCCESS: Scheduled race deleted.');
    } else {
        console.log('FAILURE: Could not delete scheduled race.');
    }

    process.exit(0);
}

testRefactor().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
