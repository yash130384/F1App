import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function fixCurrent() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        
        const sessions = await sql`
            SELECT id FROM telemetry_sessions ORDER BY created_at DESC LIMIT 1
        `;
        const sessionId = sessions[0].id;
        console.log(`Fixing session: ${sessionId}`);

        // 1. Get participants
        const participants = await sql`
            SELECT id, game_name, position, is_human FROM telemetry_participants WHERE session_id = ${sessionId}
        `;

        // 2. Get a sample of position history (e.g., from a late lap where positions are stable)
        const history = await sql`
            SELECT car_index, position FROM telemetry_position_history 
            WHERE session_id = ${sessionId} AND lap_number = 5
            LIMIT 22
        `;

        if (history.length === 0) {
             console.log("No position history found for lap 5. Trying lap 1...");
             const h1 = await sql`SELECT car_index, position FROM telemetry_position_history WHERE session_id = ${sessionId} AND lap_number = 1 LIMIT 22`;
             history.push(...h1);
        }

        console.log("Mapping logic starting...");
        for (const p of participants) {
            // Find car_index that matches this participant's position on that lap
            // Note: This logic assumes positions in telemetry_participants match the history position.
            // Since participants.position is often the FINAL position, we might need to check multiple laps.
            
            // For now, let's try to find a unique match.
            // Actually, we can just look at ALL laps and see which car_index has the most "hits" for this participant's game_name if we had lap-by-lap info.
            
            // Simpler: Just look at the AI names. They are constant.
            const aiMapping = {
                'VERSTAPPEN': 0, 'PEREZ': 1, 'RICCIARDO': 2, 'NORRIS': 3, 'PIASTRI': 4,
                'HAMILTON': 5, 'RUSSELL': 6, 'SAINZ': 7, 'LECLERC': 8, 'ALONSO': 9,
                'STROLL': 10, 'GASLY': 11, 'OCON': 12, 'ALBON': 13, 'SARGEANT': 14,
                'TSUNODA': 15, 'BOTTAS': 16, 'ZHOU': 17, 'HÜLKENBERG': 18, 'MAGNUSSEN': 19
            };

            let carIdx = null;
            if (aiMapping[p.game_name] !== undefined) {
                carIdx = aiMapping[p.game_name];
            } else {
                // It's a human. Find a car_index that is NOT in the AI mapping and exists in history.
                const usedIndices = Object.values(aiMapping);
                const availableInHistory = history.map(h => h.car_index);
                const humanIndices = availableInHistory.filter(idx => !usedIndices.includes(idx));
                
                // If there's only one human or we can match by position...
                // Let's just find any index that matches the position if possible.
                const match = history.find(h => h.position === p.position && !usedIndices.includes(h.car_index));
                if (match) carIdx = match.car_index;
                else if (humanIndices.length === 1) carIdx = humanIndices[0];
            }

            if (carIdx !== null) {
                console.log(`Mapping ${p.game_name} -> car_index ${carIdx}`);
                await sql`
                    UPDATE telemetry_participants SET car_index = ${carIdx} WHERE id = ${p.id}
                `;
            }
        }

        console.log("Fix complete.");

    } catch (err) {
        console.error("Error:", err);
    }
}

fixCurrent();
