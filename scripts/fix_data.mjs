import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

// 1. Reset Anomalous Config
console.log('--- Resetting Config ---');
const WEIRD_LEAGUE_ID = '8b4647a77bbf174075b71149cd98c4f5';
const DEFAULT_POINTS = {
    1: 20, 2: 19, 3: 18, 4: 17, 5: 16,
    6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
    11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
    16: 5, 17: 4, 18: 3, 19: 2, 20: 1
};
db.prepare('UPDATE points_config SET points_json = ?, fastest_lap_bonus = 2, clean_driver_bonus = 3 WHERE league_id = ?')
    .run(JSON.stringify(DEFAULT_POINTS), WEIRD_LEAGUE_ID);
console.log('Config reset for league ' + WEIRD_LEAGUE_ID);

// 2. Recalculate Standings
console.log('--- Recalculating Standings ---');

// Need to recalculate points_earned for each result first based on new config?
// Yes, simply resetting config doesn't change stored points_earned. Only new results.
// We must re-run calculation for existing results.

function calculatePoints(pos, fl, cd, config) {
    const p = config.points[pos] || 0;
    return p + (fl ? config.fastestLapBonus : 0) + (cd ? config.cleanDriverBonus : 0);
}

const config = { points: DEFAULT_POINTS, fastestLapBonus: 2, cleanDriverBonus: 3 };

const results = db.prepare('SELECT * FROM race_results').all();
results.forEach(r => {
    const newPoints = calculatePoints(r.position, r.fastest_lap, r.clean_driver, config);
    if (newPoints !== r.points_earned) {
        db.prepare('UPDATE race_results SET points_earned = ? WHERE id = ?').run(newPoints, r.id);
        console.log(`Updated result ${r.id}: ${r.points_earned} -> ${newPoints}`);
    }
});

// 3. Recalculate Driver Totals
const drivers = db.prepare('SELECT id FROM drivers').all();
drivers.forEach(d => {
    const res = db.prepare('SELECT SUM(points_earned) as sum FROM race_results WHERE driver_id = ?').get(d.id);
    const sum = res.sum || 0;
    db.prepare('UPDATE drivers SET total_points = ? WHERE id = ?').run(sum, d.id);
});

console.log('Database fixed check complete.');
