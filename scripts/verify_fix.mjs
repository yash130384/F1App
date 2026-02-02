import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

// Mock calculatePoints
function calculatePoints(result) {
    const BASE_POINTS = { 1: 20, 2: 19, 3: 18 };
    return (BASE_POINTS[result.position] || 0) + (result.fastestLap ? 2 : 0) + (result.cleanDriver ? 3 : 0);
}

async function runTest() {
    console.log('--- Starting Verification Test ---');

    const leagueName = `Verify League ${Date.now()}`;
    const leagueId = lowerHex(16);

    // 1. Create League
    db.prepare('INSERT INTO leagues (id, name, admin_password, join_password) VALUES (?, ?, ?, ?)').run(
        leagueId, leagueName, 'admin', 'join'
    );
    console.log(`Created League: ${leagueName}`);

    // 2. Add Driver
    const driverId = lowerHex(16);
    db.prepare('INSERT INTO drivers (league_id, id, name, team) VALUES (?, ?, ?, ?)').run(
        leagueId, driverId, 'Test Pilot', 'Test Team'
    );
    console.log(`Created Driver: ${driverId}`);

    // 3. Add Race
    const raceId = crypto.randomUUID();
    db.prepare('INSERT INTO races (id, league_id, track) VALUES (?, ?, ?)').run(
        raceId, leagueId, 'Test Track'
    );
    console.log(`Created Race: ${raceId}`);

    // 4. Add Result (The fix part)
    const res = { position: 1, fastest_lap: true, clean_driver: true };
    const points = calculatePoints({
        position: res.position,
        fastestLap: res.fastest_lap,
        cleanDriver: res.clean_driver
    });

    // This is the line that was failing: [raceId, res.driver_id, res.position, res.fastest_lap, res.clean_driver, points]
    // My fix: [raceId, driverId, res.position, res.fastest_lap ? 1 : 0, res.clean_driver ? 1 : 0, points]

    try {
        db.prepare(`
            INSERT INTO race_results (race_id, driver_id, position, fastest_lap, clean_driver, points_earned)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(raceId, driverId, res.position, res.fastest_lap ? 1 : 0, res.clean_driver ? 1 : 0, points);
        console.log('Successfully inserted race result!');
    } catch (err) {
        console.error('Failed to insert race result:', err.message);
    }

    // 5. Verify
    const results = db.prepare('SELECT * FROM race_results WHERE race_id = ?').all(raceId);
    console.log(`Verified Results in DB: ${results.length}`);
    if (results.length > 0) {
        console.log('Data:', results[0]);
    }
}

function lowerHex(bytes) {
    return crypto.randomBytes(bytes).toString('hex').toLowerCase();
}

runTest();
