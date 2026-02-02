import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

console.log('--- Database Check ---');

const leagues = db.prepare('SELECT * FROM leagues').all();
console.log(`Leagues Found: ${leagues.length}`);
leagues.forEach(l => console.log(`- ${l.name} (${l.id})`));

const drivers = db.prepare('SELECT * FROM drivers').all();
console.log(`Drivers Found: ${drivers.length}`);
drivers.forEach(d => console.log(`  Driver: ${d.name}, League: ${d.league_id}, Points: ${d.total_points}`));

const races = db.prepare('SELECT * FROM races').all();
console.log(`Races Found: ${races.length}`);
races.forEach(r => console.log(`  Race: ${r.track}, League: ${r.league_id}`));

const results = db.prepare('SELECT * FROM race_results').all();
console.log(`Race Results Found: ${results.length}`);
