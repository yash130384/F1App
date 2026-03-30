import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

console.log('--- Inspecting Points Config ---');
const configs = db.prepare('SELECT * FROM points_config').all();
configs.forEach(c => {
    console.log(`League ID: ${c.league_id}`);
    console.log(`FL Bonus: ${c.fastest_lap_bonus} (Type: ${typeof c.fastest_lap_bonus})`);
    console.log(`CD Bonus: ${c.clean_driver_bonus} (Type: ${typeof c.clean_driver_bonus})`);
    console.log(`Points JSON: ${c.points_json}`);
    console.log('---');
});

console.log('--- Inspecting High Point Results ---');
const highPoints = db.prepare('SELECT * FROM race_results WHERE points_earned > 30').all();
highPoints.forEach(r => {
    console.log(`Race ID: ${r.race_id}, Driver ID: ${r.driver_id}, Pos: ${r.position}, Pts: ${r.points_earned}`);
});

console.log('--- Inspecting Races ---');
const races = db.prepare('SELECT * FROM races').all();
races.forEach(r => console.log(`Race: ${r.track} (${r.id})`));
