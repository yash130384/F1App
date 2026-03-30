import Database from 'better-sqlite3';
import path from 'path';
import { deleteLeague } from '../src/lib/actions.ts'; // Wait, I can't import TS directly in node without loader. 
// I should use the compiled output or just recreate the logic for testing?
// Or just query the DB directly to see if I can delete.

// Let's just use the DB directly to test constraints, mirroring the deleteLeague logic.
const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

async function testDelete() {
    console.log('--- Testing Deletion ---');
    // 1. Create a dummy league
    const id = 'deleteme-' + Date.now();
    db.prepare('INSERT INTO leagues (id, name, admin_password, join_password) VALUES (?, ?, ?, ?)').run(id, 'Delete Me', 'admin', 'join');
    console.log('Created dummy league: ' + id);

    // 2. Try to delete it using the same SQL operations as the app
    try {
        // drivers
        const drivers = db.prepare('SELECT id FROM drivers WHERE league_id = ?').all(id);
        for (const d of drivers) {
            db.prepare('DELETE FROM race_results WHERE driver_id = ?').run(d.id);
        }
        db.prepare('DELETE FROM races WHERE league_id = ?').run(id);
        db.prepare('DELETE FROM drivers WHERE league_id = ?').run(id);
        db.prepare('DELETE FROM leagues WHERE id = ?').run(id);

        console.log('Deletion successful via Script.');
    } catch (err) {
        console.error('Deletion failed:', err);
    }
}

testDelete();
