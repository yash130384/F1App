const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env' });

async function test() {
    const sql = neon(process.env.DATABASE_URL);

    const results = await sql`
        SELECT r.track, res.driver_id, d.name, res.position
        FROM race_results res
        JOIN races r ON r.id = res.race_id
        LEFT JOIN drivers d ON d.id = res.driver_id
        ORDER BY r.race_date DESC, res.position ASC
        LIMIT 10
    `;
    console.log('Recent Race Results:', results);

    // Teste die Telemetrie-Verknüpfung wie auf dem Dashboard:
    const dashboardQuery = await sql`
        SELECT s.id as session_id, p.id as participant_id, p.driver_id, COUNT(l.id) as lap_count
        FROM telemetry_sessions s
        JOIN telemetry_participants p ON p.session_id = s.id
        LEFT JOIN telemetry_laps l ON l.participant_id = p.id
        WHERE s.race_id IS NOT NULL AND p.driver_id IS NOT NULL
        GROUP BY s.id, p.id, p.driver_id
        LIMIT 5
    `;
    console.log('Dashboard Telemetry Check:', dashboardQuery);
}

test().catch(console.error);
