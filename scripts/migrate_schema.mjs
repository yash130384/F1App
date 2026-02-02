import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'league.db');
const db = new Database(DB_PATH);

console.log('--- Migrating Database ---');

try {
    db.prepare('ALTER TABLE races ADD COLUMN is_finished BOOLEAN DEFAULT 1').run();
    console.log('Added is_finished column.');
} catch (e) {
    console.log('is_finished column likely already exists.');
}

try {
    db.prepare('ALTER TABLE races ADD COLUMN scheduled_date TIMESTAMP').run();
    console.log('Added scheduled_date column.');
} catch (e) {
    console.log('scheduled_date column likely already exists.');
}

console.log('Migration complete.');
