import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

console.log('--- Checking Totals ---');
const drivers = db.prepare('SELECT id, name, total_points FROM drivers').all();
drivers.forEach(d => {
    const res = db.prepare('SELECT SUM(points_earned) as sum FROM race_results WHERE driver_id = ?').get(d.id);
    const sum = res.sum || 0;
    if (d.total_points !== sum) {
        console.log(`MISMATCH: ${d.name} (ID: ${d.id}) - Total: ${d.total_points}, Sum: ${sum}`);
    } else {
        console.log(`OK: ${d.name} - Total: ${d.total_points}`);
    }
});
