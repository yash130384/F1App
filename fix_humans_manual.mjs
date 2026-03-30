import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function fixHumans() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const sessionId = '9875a46e-6d0b-42aa-9178-ab0facbf7584';

        const mapping = {
            'Markus\u00A0Lanz': 17, // Position 1
            'kleosadecosta': 16,     // Position 2
            'Dox23y5': 19,           // Position 3
            'kaydn87': 18            // Position 4
        };

        for (const [name, idx] of Object.entries(mapping)) {
            console.log(`Fixing ${name} -> ${idx}`);
            await sql`
                UPDATE telemetry_participants 
                SET car_index = ${idx} 
                WHERE session_id = ${sessionId} AND game_name = ${name}
            `;
        }
        console.log("Fix complete.");

    } catch (err) {
        console.error("Error:", err);
    }
}

fixHumans();
