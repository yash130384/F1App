import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function debugPositions() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const sessionId = '9875a46e-6d0b-42aa-9178-ab0facbf7584';

        console.log("Humans in participants:");
        const humans = await sql`
            SELECT id, game_name, position FROM telemetry_participants 
            WHERE session_id = ${sessionId} AND is_human = true
        `;
        console.table(humans);

        console.log("\nHistory sample (Lap 1):");
        const hist = await sql`
            SELECT car_index, position FROM telemetry_position_history 
            WHERE session_id = ${sessionId} AND lap_number = 1
            ORDER BY position ASC
        `;
        console.table(hist);

    } catch (err) {
        console.error("Error:", err);
    }
}

debugPositions();
