import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) process.exit(1);
    const sql = neon(dbUrl);
    
    const tables = ['telemetry_participants'];
    const newColumns = [
        { name: 'total_race_time', type: 'REAL' },
        { name: 'penalties_count', type: 'INTEGER' },
        { name: 'steering_assist', type: 'BOOLEAN' },
        { name: 'braking_assist', type: 'INTEGER' },
        { name: 'gearbox_assist', type: 'INTEGER' },
        { name: 'traction_control', type: 'INTEGER' },
        { name: 'anti_lock_brakes', type: 'BOOLEAN' }
    ];

    console.log('--- Migrating telemetry_participants ... ---');
    for (const col of newColumns) {
        try {
            await sql.query(`ALTER TABLE telemetry_participants ADD COLUMN ${col.name} ${col.type}`);
            console.log(`Added ${col.name}`);
        } catch (e) {
            console.log(`${col.name} skipping (maybe exists)`);
        }
    }
    
    process.exit(0);
}
fix();
