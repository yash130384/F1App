import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Parsers
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

dotenv.config({ path: '../.env' });
const sql = neon(process.env.DATABASE_URL);

async function processFile(targetFile, raceId) {
    if (!fs.existsSync(targetFile)) {
        console.error("Datei existiert nicht:", targetFile);
        return;
    }
    
    console.log(`\nImportiere: ${targetFile}`);

    const state = new SessionState();
    const stats = fs.statSync(targetFile);
    const fd = fs.openSync(targetFile, 'r');
    
    let offset = 0;
    let packetCount = 0;
    const CHUNK_SIZE = 50000;
    let sessionId = crypto.randomUUID();
    
    // Find Kleosa League
    const leagues = await sql`SELECT id FROM leagues WHERE name ILIKE '%Kleosa%'`;
    if (leagues.length === 0) throw new Error("Kleosa league not found");
    let leagueId = leagues[0].id;

    console.log(`Using League ID: ${leagueId} and new Session ID: ${sessionId} for Race ID: ${raceId}`);

    // Wir erstellen die Session erst nach dem Einlesen teilweise, 
    // um die trackId aus dem State zu extrahieren. Wir lesen das File komplett zuerst.
    
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
    }
    fs.closeSync(fd);
    
    console.log(`File parsed. Packets: ${packetCount}`);
    
    const trackId = state.sessionData?.trackId || 0;
    const trackLength = state.sessionData?.trackLength || 0;
    
    await sql`
        INSERT INTO telemetry_sessions (id, league_id, race_id, track_id, track_length, session_type, is_active) 
        VALUES (${sessionId}, ${leagueId}, ${raceId}, ${trackId}, ${trackLength}, 'Race', false)
    `;

    console.log(`Session Entity angelegt. Speichere Daten in DB...`);
    await syncToNeon(state, sessionId, leagueId, true);
    console.log(`Migration für ${targetFile} abgeschlossen.`);
}

function handlePacket(msg, state) {
    if (msg.length < 29) return;
    const header = parseHeader(msg);
    switch (header.packetId) {
        case 0: break;
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
    // Map with race_results
    const raceResults = await sql`
        SELECT r.driver_id, d.game_name 
        FROM race_results r
        JOIN drivers d ON r.driver_id = d.id
        WHERE r.race_id = (SELECT race_id FROM telemetry_sessions WHERE id = ${sessionId})
    `;
    const driverMap = {};
    for (const rr of raceResults) {
        if (rr.game_name) {
            driverMap[rr.game_name.toLowerCase()] = rr.driver_id;
        }
    }

    const partMapping = {};
    for (const p of payload.participants) {
        const dId = driverMap[p.gameName?.toLowerCase()] || null;
        const pRows = await sql`
            INSERT INTO telemetry_participants 
            (session_id, driver_id, game_name, team_id, position, car_index, is_human, lap_distance, top_speed)
            VALUES (${sessionId}, ${dId}, ${p.gameName}, ${p.teamId}, ${p.position}, ${p.carIndex}, ${p.isHuman}, ${p.lapDistance}, ${p.topSpeedKmh})
            ON CONFLICT(session_id, game_name) DO UPDATE SET
                position = EXCLUDED.position,
                car_index = EXCLUDED.car_index,
                lap_distance = EXCLUDED.lap_distance,
                driver_id = COALESCE(telemetry_participants.driver_id, EXCLUDED.driver_id),
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
        for (let i = 0; i < lapsToInsert.length; i += 100) {
            const chunk = lapsToInsert.slice(i, i + 100);
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

async function runUpload() {
    // Determine the actual race IDs for Australia and China inside Kleosa league
    const races = await sql`SELECT id, track FROM races WHERE league_id = (SELECT id FROM leagues WHERE name ILIKE '%Kleosa%')`;
    
    // We map manually by track names found in races
    // "Shanghai International Circuit (China)"
    // "Albert Park Circuit (Australia)"
    
    const ausRace = races.find(r => r.track.includes('Australia'));
    const chinaRace = races.find(r => r.track.includes('China'));
    
    if (!ausRace || !chinaRace) {
        console.error("Konnte Rennen nicht finden. Vorhanden:", races);
        return;
    }
    
    const recDir = path.join(process.cwd(), '..', 'recordings');
    
    // 2. Rennen: Australia (ältere Datei)
    const ausFile = path.join(recDir, 'session_14668411044586209823_2026-03-11T20-14-35-318Z.bin');
    await processFile(ausFile, ausRace.id);
    
    // 1. Rennen: China (neuste Datei)
    const chinaFile = path.join(recDir, 'session_4727042711014586294_2026-03-18T20-48-51-728Z.bin');
    await processFile(chinaFile, chinaRace.id);

    console.log("\nAlles fertig!");
}

runUpload().catch(console.error);
