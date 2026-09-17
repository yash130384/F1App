import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL is missing in environment!');
    process.exit(1);
}

const sql = neon(dbUrl);

async function seedSeason3() {
    console.log('🏎 Initializing Season 3 Database Setup & Seeding...');

    // 1. Check if 'Season 3' exists; if not, create it
    const existingLeagues = await sql`SELECT id, name FROM leagues WHERE name = 'Season 3'`;
    let leagueId;

    if (existingLeagues.length > 0) {
        leagueId = existingLeagues[0].id;
        console.log(`Found existing league "Season 3" with ID: ${leagueId}`);
        // Clean up previous races/results/drivers/teams for a clean, deterministic seed
        await sql`DELETE FROM race_results WHERE race_id IN (SELECT id FROM races WHERE league_id = ${leagueId})`;
        await sql`DELETE FROM races WHERE league_id = ${leagueId}`;
        await sql`DELETE FROM drivers WHERE league_id = ${leagueId}`;
        await sql`DELETE FROM teams WHERE league_id = ${leagueId}`;
        await sql`DELETE FROM points_config WHERE league_id = ${leagueId}`;
    } else {
        const [newLeague] = await sql`
            INSERT INTO leagues (name, is_completed, teams_locked, join_locked)
            VALUES ('Season 3', false, 0, 0)
            RETURNING id, name
        `;
        leagueId = newLeague.id;
        console.log(`Created new league "Season 3" with ID: ${leagueId}`);
    }

    // 2. Configure Points System
    const pointsMap = {
        1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
        6: 8, 7: 6, 8: 4, 9: 2, 10: 1
    };
    const qualiPointsMap = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0
    };

    await sql`
        INSERT INTO points_config (
            league_id, points_json, quali_points_json, fastest_lap_bonus, clean_driver_bonus, total_races, track_pool
        ) VALUES (
            ${leagueId},
            ${JSON.stringify(pointsMap)},
            ${JSON.stringify(qualiPointsMap)},
            1,
            0,
            3,
            ${JSON.stringify(['Spa', 'Silverstone', 'Austria'])}
        )
    `;
    console.log('✓ Points configuration set (25-18-15-... + 1 FL)');

    // 3. Create Teams
    const [mclaren] = await sql`
        INSERT INTO teams (league_id, name, color)
        VALUES (${leagueId}, 'McLaren', '#FF8000')
        RETURNING id, name
    `;
    const [mercedes] = await sql`
        INSERT INTO teams (league_id, name, color)
        VALUES (${leagueId}, 'Mercedes', '#00D2BE')
        RETURNING id, name
    `;
    const [ferrari] = await sql`
        INSERT INTO teams (league_id, name, color)
        VALUES (${leagueId}, 'Ferrari', '#E8002D')
        RETURNING id, name
    `;
    console.log(`✓ Teams registered: McLaren (${mclaren.id}), Mercedes (${mercedes.id}), Ferrari (${ferrari.id})`);

    // 4. Create the 4 Human Drivers (no AI drivers)
    const [kaydn] = await sql`
        INSERT INTO drivers (league_id, name, team, team_id, color, game_name, total_points, raw_points)
        VALUES (${leagueId}, 'kaydn87', 'Ferrari', ${ferrari.id}, '#E8002D', 'kaydn87', 69, 69)
        RETURNING id, name
    `;
    const [lanz] = await sql`
        INSERT INTO drivers (league_id, name, team, team_id, color, game_name, total_points, raw_points)
        VALUES (${leagueId}, 'Markus Lanz', 'McLaren', ${mclaren.id}, '#FF8000', 'TRunKX', 58, 58)
        RETURNING id, name
    `;
    const [dox] = await sql`
        INSERT INTO drivers (league_id, name, team, team_id, color, game_name, total_points, raw_points)
        VALUES (${leagueId}, 'Dox23y5', 'Mercedes', ${mercedes.id}, '#00D2BE', 'Dox23y5', 34, 34)
        RETURNING id, name
    `;
    const [precht] = await sql`
        INSERT INTO drivers (league_id, name, team, team_id, color, game_name, total_points, raw_points)
        VALUES (${leagueId}, 'Richard David Precht', 'Independent', null, '#7F8C8D', 'Richard David Precht', 0, 0)
        RETURNING id, name
    `;
    console.log(`✓ Drivers created: ${kaydn.name}, ${lanz.name}, ${dox.name}, ${precht.name}`);

    // 5. Create Races & Results

    // Race 1: Spa-Francorchamps (Date: 2026-09-01)
    const [race1] = await sql`
        INSERT INTO races (league_id, track, scheduled_date, race_date, is_finished, is_random, is_hidden)
        VALUES (${leagueId}, 'Spa', '2026-09-01T18:00:00Z', '2026-09-01T19:00:00Z', true, false, false)
        RETURNING id, track
    `;
    await sql`
        INSERT INTO race_results (race_id, driver_id, position, quali_position, fastest_lap, clean_driver, is_dnf, points_earned)
        VALUES 
            (${race1.id}, ${lanz.id}, 1, 1, false, false, false, 25),
            (${race1.id}, ${kaydn.id}, 2, 2, false, false, false, 18),
            (${race1.id}, ${dox.id}, 3, 3, false, false, false, 15),
            (${race1.id}, ${precht.id}, 4, 4, false, false, true, 0)
    `;
    console.log('✓ Race 1: Spa recorded (Lanz P1 25P, kaydn87 P2 18P, Dox23y5 P3 15P, Precht DNF 0P)');

    // Race 2: Silverstone (Date: 2026-09-08)
    const [race2] = await sql`
        INSERT INTO races (league_id, track, scheduled_date, race_date, is_finished, is_random, is_hidden)
        VALUES (${leagueId}, 'Silverstone', '2026-09-08T18:00:00Z', '2026-09-08T19:00:00Z', true, false, false)
        RETURNING id, track
    `;
    await sql`
        INSERT INTO race_results (race_id, driver_id, position, quali_position, fastest_lap, clean_driver, is_dnf, penalties_time, points_earned)
        VALUES 
            (${race2.id}, ${kaydn.id}, 1, 1, false, false, false, 0, 25),
            (${race2.id}, ${dox.id}, 2, 2, true, false, false, 0, 19),
            (${race2.id}, ${lanz.id}, 3, 3, false, false, false, 3, 15)
    `;
    console.log('✓ Race 2: Silverstone recorded (kaydn87 P1 25P, Dox23y5 P2 + FL 19P, Lanz P3 +3s 15P)');

    // Race 3: Red Bull Ring / Austria (Date: 2026-09-15)
    const [race3] = await sql`
        INSERT INTO races (league_id, track, scheduled_date, race_date, is_finished, is_random, is_hidden)
        VALUES (${leagueId}, 'Austria', '2026-09-15T18:00:00Z', '2026-09-15T19:00:00Z', true, false, false)
        RETURNING id, track
    `;
    await sql`
        INSERT INTO race_results (race_id, driver_id, position, quali_position, fastest_lap, clean_driver, is_dnf, penalties_time, points_earned)
        VALUES 
            (${race3.id}, ${kaydn.id}, 1, 1, true, false, false, 0, 26),
            (${race3.id}, ${lanz.id}, 2, 2, false, false, false, 3, 18),
            (${race3.id}, ${dox.id}, 3, 3, false, false, true, 0, 0)
    `;
    console.log('✓ Race 3: Red Bull Ring recorded (kaydn87 P1 + FL 26P, Lanz P2 +3s 18P, Dox23y5 P3/DNF 0P)');

    // 6. Verify and calculate final standings from DB
    console.log('\n📊 VERIFYING OFFICIAL CHAMPIONSHIP STANDINGS FROM NEON DB:');
    const standingsQuery = await sql`
        SELECT 
            d.name AS driver,
            COALESCE(t.name, 'Independent') AS team,
            COUNT(CASE WHEN rr.position = 1 AND NOT rr.is_dnf THEN 1 END) AS wins,
            COUNT(CASE WHEN rr.position <= 3 AND NOT rr.is_dnf THEN 1 END) AS podiums,
            COUNT(CASE WHEN rr.fastest_lap THEN 1 END) AS fastest_laps,
            COALESCE(SUM(rr.points_earned), 0) AS total_points
        FROM drivers d
        LEFT JOIN teams t ON d.team_id = t.id
        LEFT JOIN race_results rr ON d.id = rr.driver_id
        WHERE d.league_id = ${leagueId}
        GROUP BY d.id, d.name, t.name
        ORDER BY total_points DESC, wins DESC
    `;

    console.table(standingsQuery);

    // Assert expected point values
    const pointCheck = {
        'kaydn87': 69,
        'Markus Lanz': 58,
        'Dox23y5': 34,
        'Richard David Precht': 0
    };

    let allCorrect = true;
    for (const row of standingsQuery) {
        const expected = pointCheck[row.driver];
        const actual = Number(row.total_points);
        if (actual !== expected) {
            console.error(`❌ Mismatch for ${row.driver}: Expected ${expected}, got ${actual}`);
            allCorrect = false;
        } else {
            console.log(`✅ ${row.driver}: ${actual} Points (VERIFIED)`);
        }
    }

    if (!allCorrect) {
        throw new Error('Points verification failed!');
    }

    console.log('\n🏁 Season 3 Setup successfully verified and locked into DB.');
}

seedSeason3()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal seed error:', err);
        process.exit(1);
    });
