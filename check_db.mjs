import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function check() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const rows = await sql`
            SELECT p.game_name, p.car_index, p.position as final_pos, h.lap_number, h.position as hist_pos
            FROM telemetry_participants p
            JOIN telemetry_position_history h ON h.session_id = p.session_id AND h.car_index = p.car_index
            WHERE p.game_name ILIKE '%Lanz%'
            ORDER BY h.lap_number ASC
            LIMIT 50;
        `;
        console.log("ROWS FOUND:", rows.length);
        console.table(rows);
    } catch (err) {
        console.error("ERROR:", err);
    }
}
check();
