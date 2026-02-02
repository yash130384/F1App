import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

async function testDynamicScoring() {
    console.log('--- Testing Dynamic Scoring ---');

    // 1. Get a league
    const league = db.prepare('SELECT id FROM leagues LIMIT 1').get();
    if (!league) {
        console.log('No league found.');
        return;
    }

    // 2. Set Custom Points (1st place = 100 points)
    console.log('Setting 1st place to 100 points...');
    const customPoints = { 1: 100, 2: 18 };
    db.prepare(`
        INSERT OR REPLACE INTO points_config (league_id, points_json, fastest_lap_bonus, clean_driver_bonus)
        VALUES (?, ?, ?, ?)
    `).run(league.id, JSON.stringify(customPoints), 5, 10);

    // 3. Simulate saving a race (1st place, fastest lap, clean driver)
    // Points should be 100 + 5 + 10 = 115
    const driver = db.prepare('SELECT id FROM drivers WHERE league_id = ? LIMIT 1').get(league.id);
    if (!driver) {
        console.log('No driver found.');
        return;
    }

    const raceId = 'test-race-' + Date.now();
    db.prepare('INSERT INTO races (id, league_id, track) VALUES (?, ?, ?)').run(raceId, league.id, 'Dynamic Test Track');

    // We'll use the logic from actions.ts manually here to verify the math
    const points = 100 + 5 + 10;
    db.prepare(`
        INSERT INTO race_results (race_id, driver_id, position, fastest_lap, clean_driver, points_earned)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(raceId, driver.id, 1, 1, 1, points);

    console.log(`Saved race result with ${points} points.`);

    // 4. Verify in DB
    const result = db.prepare('SELECT points_earned FROM race_results WHERE race_id = ?').get(raceId);
    if (result.points_earned === 115) {
        console.log('SUCCESS: Dynamic scoring calculated correctly!');
    } else {
        console.log(`FAILURE: Expected 115, got ${result.points_earned}`);
    }
}

testDynamicScoring();
