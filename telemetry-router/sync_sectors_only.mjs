import fs from 'fs';
import path from 'path';
import { parseHeader } from './dist/parsers/header.js';
import { parseSessionHistoryData } from './dist/parsers/sessionHistory.js';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Load root .env

async function sync() {
    try {
        const sql = neon(process.env.DATABASE_URL);
        const sessionId = '9875a46e-6d0b-42aa-9178-ab0facbf7584'; // The broken session in Neon

        // 1. Get participant mapping
        const participants = await sql`
            SELECT id, car_index FROM telemetry_participants WHERE session_id = ${sessionId} AND car_index IS NOT NULL
        `;
        const carToPartId = {};
        participants.forEach(p => { carToPartId[p.car_index] = p.id; });

        console.log(`Syncing sectors for session ${sessionId} (${participants.length} participants)`);

        const recDir = path.join(process.cwd(), '..', 'recordings');
        const files = fs.readdirSync(recDir).filter(f => f.endsWith('.bin'))
            .map(f => ({ name: f, stat: fs.statSync(path.join(recDir, f)) }))
            .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

        const targetFile = path.join(recDir, files[0].name);
        console.log(`Reading from: ${targetFile}`);

        const stats = fs.statSync(targetFile);
        const fd = fs.openSync(targetFile, 'r');
        let offset = 0;
        let count = 0;

        while (offset < stats.size) {
            const headerBuffer = Buffer.alloc(6);
            fs.readSync(fd, headerBuffer, 0, 6, offset);
            offset += 6;
            const length = headerBuffer.readUInt16LE(4);
            if (length === 0 || length > 4000) break;
            const packetBuffer = Buffer.alloc(length);
            fs.readSync(fd, packetBuffer, 0, length, offset);
            offset += length;

            const header = parseHeader(packetBuffer);
            if (header.packetId === 11) {
                const history = parseSessionHistoryData(packetBuffer, header);
                const partId = carToPartId[history.carIdx];
                if (partId) {
                    // Update ALL laps for THIS participant from history
                    for (const lap of history.lapHistoryData) {
                        if (lap.sector1TimeInMS > 0 || lap.sector2TimeInMS > 0 || lap.sector3TimeInMS > 0) {
                            await sql`
                                UPDATE telemetry_laps 
                                SET sector1_ms = ${lap.sector1TimeInMS}, 
                                    sector2_ms = ${lap.sector2TimeInMS}, 
                                    sector3_ms = ${lap.sector3TimeInMS}
                                WHERE participant_id = ${partId} AND lap_number = ${lap.lapNumber}
                            `;
                            count++;
                        }
                    }
                }
            }
        }
        fs.closeSync(fd);
        console.log(`Sync complete. Updated ${count} lap sector records.`);

    } catch (err) {
        console.error("Error:", err);
    }
}

sync();
