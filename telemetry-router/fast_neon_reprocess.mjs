import fs from 'fs';
import path from 'path';
import { SessionState } from './dist/state.js';
import { parseHeader } from './dist/parsers/header.js';
import { parseSession } from './dist/parsers/session.js';
import { parseParticipants } from './dist/parsers/participants.js';
import { parseLapData } from './dist/parsers/lapData.js';
import { parseTelemetry } from './dist/parsers/telemetry.js';
import { parseCarStatus } from './dist/parsers/carStatus.js';
import { parseEventData } from './dist/parsers/eventData.js';
import { parseCarDamage } from './dist/parsers/carDamage.js';
import { parseSessionHistoryData } from './dist/parsers/sessionHistory.js';
import { parseMotionData } from './dist/parsers/motionData.js';
import { parseMotionExData } from './dist/parsers/motionEx.js';
import { parseTyreSets } from './dist/parsers/tyreSets.js';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const sql = neon(process.env.DATABASE_URL);

async function run() {
    console.log("Starting FAST Direct Neon Reprocess...");
    const recDir = path.join(process.cwd(), '..', 'recordings');
    const files = fs.readdirSync(recDir).filter(f => f.endsWith('.bin'))
        .map(f => ({ name: f, stat: fs.statSync(path.join(recDir, f)) }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    const targetFile = path.join(recDir, files[0].name);
    console.log(`Processing: ${targetFile}`);

    const state = new SessionState();
    const stats = fs.statSync(targetFile);
    const fd = fs.openSync(targetFile, 'r');
    
    let offset = 0;
    let packetCount = 0;
    const CHUNK_SIZE = 20000;
    let sessionId = crypto.randomUUID();
    let leagueId = 'kleosa_season_1_demo'; // We'll need to find the real one if it matters
    
    // Find a valid leagueId
    const leagues = await sql`SELECT id FROM leagues LIMIT 1`;
    if (leagues.length > 0) leagueId = leagues[0].id;

    console.log(`Using League ID: ${leagueId} and new Session ID: ${sessionId}`);

    // Create session
    await sql`INSERT INTO telemetry_sessions (id, league_id, track_id, track_length, session_type, is_active) VALUES (${sessionId}, ${leagueId}, 0, 0, 'Race', true)`;

    while (offset < stats.size) {
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;
        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 4000) break;
        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;

        handlePacket(packetBuffer, state);
        packetCount++;

        if (packetCount % CHUNK_SIZE === 0) {
            await syncToNeon(state, sessionId, leagueId);
            process.stdout.write(`\rPackets: ${packetCount}...`);
        }
    }

    await syncToNeon(state, sessionId, leagueId, true);
    fs.closeSync(fd);
    console.log(`\nFinished. Now promoting session ${sessionId}...`);
    
    // Promote session
    await sql`UPDATE telemetry_sessions SET is_active = false WHERE id = ${sessionId}`;
    // We could call the promotion logic here, but let's just leave it for the user to "Promote" if needed
    // or we do it now.
    const race = await sql`SELECT id FROM races WHERE league_id = ${leagueId} ORDER BY created_at DESC LIMIT 1`;
    if (race.length > 0) {
        await sql`UPDATE telemetry_sessions SET race_id = ${race[0].id} WHERE id = ${sessionId}`;
    }

    console.log("Migration successful.");
}

function handlePacket(msg, state) {
    if (msg.length < 29) return;
    const header = parseHeader(msg);
    switch (header.packetId) {
        case 0: break; // Skip motion for speed if only results/sectors needed, or parse if needed
        case 1: state.updateSession(parseSession(msg)); break;
        case 2: parseLapData(msg).forEach((l, i) => state.updateLapData(i, l)); break;
        case 3: state.handleEvent(parseEventData(msg)); break;
        case 4: parseParticipants(msg).forEach((p, i) => state.updateParticipant(i, p)); break;
        case 6: parseTelemetry(msg).forEach((t, i) => state.updateTelemetry(i, t)); break;
        case 7: parseCarStatus(msg).forEach((cs, i) => state.updateCarStatus(i, cs)); break;
        case 10: parseCarDamage(msg).forEach((cd, i) => state.updateCarDamage(i, cd)); break;
        case 11: state.updateSessionHistory(parseSessionHistoryData(msg, header)); break;
        case 13: state.updateMotionEx(header.playerCarIndex, parseMotionExData(msg)); break;
        case 15: state.updateLapPositions(msg); break;
        case 20: { const td = parseTyreSets(msg); state.updateTyreSets(td.carIdx, td.tyreSetData); break; }
    }
}

async function syncToNeon(state, sessionId, leagueId, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    if (!payload.participants.length && !isFinal) return;

    // 1. Participant mapping (Upsert)
    const partMapping = {};
    for (const p of payload.participants) {
        const pRows = await sql`
            INSERT INTO telemetry_participants 
            (session_id, game_name, team_id, position, car_index, is_human, lap_distance, top_speed)
            VALUES (${sessionId}, ${p.gameName}, ${p.teamId}, ${p.position}, ${p.carIndex}, ${p.isHuman}, ${p.lapDistance}, ${p.topSpeedKmh})
            ON CONFLICT(session_id, game_name) DO UPDATE SET
                position = EXCLUDED.position,
                car_index = EXCLUDED.car_index,
                lap_distance = EXCLUDED.lap_distance,
                top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END
            RETURNING id
        `;
        partMapping[p.gameName] = pRows[0].id;
    }

    // 2. Bulk Laps
    const lapsToInsert = [];
    for (const p of payload.participants) {
        const partId = partMapping[p.gameName];
        if (p.laps && p.laps.length > 0) {
            for (const lap of p.laps) {
                lapsToInsert.push({
                    participant_id: partId,
                    lap_number: lap.lapNumber,
                    lap_time_ms: lap.lapTimeMs,
                    is_valid: lap.isValid,
                    sector1_ms: lap.sector1Ms,
                    sector2_ms: lap.sector2Ms,
                    sector3_ms: lap.sector3Ms,
                    tyre_compound: lap.tyreCompound
                });
            }
        }
    }

    if (lapsToInsert.length > 0) {
        // Neon handles roughly 100-200 rows per insert easily
        for (let i = 0; i < lapsToInsert.length; i += 100) {
            const chunk = lapsToInsert.slice(i, i + 100);
            // We can't use '?' in neon template strings for variables, but we can map
            // Since neon is not a tagged template for dynamic columns, we define values.
            // Simplified: loop for now, but in chunks.
            await Promise.all(chunk.map(lap => sql`
                INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, tyre_compound)
                VALUES (${lap.participant_id}, ${lap.lap_number}, ${lap.lap_time_ms}, ${lap.is_valid}, ${lap.sector1_ms}, ${lap.sector2_ms}, ${lap.sector3_ms}, ${lap.tyre_compound})
                ON CONFLICT DO NOTHING
            `));
        }
    }

    // 3. Bulk Position History
    if (payload.lapPositions && payload.lapPositions.length > 0) {
        for (let i = 0; i < payload.lapPositions.length; i += 100) {
            const chunk = payload.lapPositions.slice(i, i + 100);
            await Promise.all(chunk.map(lp => sql`
                INSERT INTO telemetry_position_history (session_id, car_index, lap_number, position)
                VALUES (${sessionId}, ${lp.carIndex}, ${lp.lapNumber}, ${lp.position})
                ON CONFLICT DO NOTHING
            `));
        }
    }
}

run().catch(console.error);
