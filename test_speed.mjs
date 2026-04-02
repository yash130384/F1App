import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        process.exit(1);
    }
    const sql = neon(dbUrl);

    console.log('--- Database Speed Analysis (Neon HTTP) ---');

    // TEST A: Sequential Small Inserts (The "Ping-Pong" problem)
    console.log('\nTest A: 20 sequential Small (Ping-Pong latency)...');
    const startA = Date.now();
    for (let i = 0; i < 20; i++) {
        await sql.query('INSERT INTO telemetry_track_metadata (id, track_id, curve_name, distance_start, distance_end) VALUES (gen_random_uuid(), 999, $1, $2, $3)', [`C${i}`, i, i+1]);
    }
    const durationA = Date.now() - startA;
    console.log(`Result A: 20 Inserts took ${durationA}ms (Avg: ${Math.round(durationA / 20)}ms/query)`);

    // TEST B: 1 Large Insert (The "Bulk" performance)
    console.log('\nTest B: 1 Large Query (Large string payload, single ping-pong)...');
    const largeValue = "A".repeat(100000); // 100KB string
    const startB = Date.now();
    // Use curve_name as a storage for the large string
    await sql.query('INSERT INTO telemetry_track_metadata (id, track_id, curve_name, distance_start, distance_end) VALUES (gen_random_uuid(), 999, $1, 0, 0)', [largeValue]);
    const durationB = Date.now() - startB;
    console.log(`Result B: 1 Large Query (100KB) took ${durationB}ms`);

    // TEST C: Parallel Small Inserts (Concurrency)
    console.log('\nTest C: 10 Parallel Small Inserts...');
    const startC = Date.now();
    await Promise.all(Array.from({ length: 10 }, (_, i) => 
        sql.query('INSERT INTO telemetry_track_metadata (id, track_id, curve_name, distance_start, distance_end) VALUES (gen_random_uuid(), 999, $1, $2, $3)', [`P${i}`, i, i+1])
    ));
    const durationC = Date.now() - startC;
    console.log(`Result C: 10 Parallel took ${durationC}ms (Avg per call: ${Math.round(durationC / 10)}ms)`);

    // Conclusion Script
    console.log('\n--- Conclusion ---');
    console.log(`100KB transfer was ${Math.round(durationA / durationB)}x faster than 20 individual small requests.`);
    
    // Cleanup
    await sql.query('DELETE FROM telemetry_track_metadata WHERE track_id = 999');
    process.exit(0);
}

runTest();
