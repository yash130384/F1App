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
    
    console.log(`\nImportiere (MIT Schadensdaten): ${targetFile}`);

    const state = new SessionState();
    const stats = fs.statSync(targetFile);
    const fd = fs.openSync(targetFile, 'r');
    
    let offset = 0;
    
    // Kleosa League
    const leagues = await sql`SELECT id FROM leagues WHERE name ILIKE '%Kleosa%'`;
    if (leagues.length === 0) throw new Error("Kleosa league not found");
    let leagueId = leagues[0].id;

    // LÖSCHE VORHERIGE SESSIONS FÜR DIESES RENNEN DAMIT WIR NICHT DOPPELT IMPORTIEREN
    console.log(`Lösche alte Telemetrie für Race ID ${raceId}...`);
    const oldSessions = await sql`SELECT id FROM telemetry_sessions WHERE race_id = ${raceId}`;
    for (const old of oldSessions) {
        await sql`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ${old.id})`;
        await sql`DELETE FROM telemetry_position_history WHERE session_id = ${old.id}`;
        await sql`DELETE FROM telemetry_incidents WHERE session_id = ${old.id}`;
        await sql`DELETE FROM telemetry_participants WHERE session_id = ${old.id}`;
        await sql`DELETE FROM telemetry_sessions WHERE id = ${old.id}`;
    }
    
    // NEVE SESSION
    let sessionId = crypto.randomUUID();
    
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
    }
    fs.closeSync(fd);
    
    const trackId = state.sessionData?.trackId || 0;
    const trackLength = state.sessionData?.trackLength || 0;
    
    await sql`
        INSERT INTO telemetry_sessions (id, league_id, race_id, track_id, track_length, session_type, is_active) 
        VALUES (${sessionId}, ${leagueId}, ${raceId}, ${trackId}, ${trackLength}, 'Race', false)
    `;

    console.log(`Starte Sync zu Neon...`);
    await syncToNeon(state, sessionId, leagueId, true);
    console.log(`Migration abgeschlossen.`);
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
            RETURNING id
        `;
        partMapping[p.gameName] = pRows[0].id;
    }

    const lapsToInsert = [];
    for (const p of payload.participants) {
        const partId = partMapping[p.gameName];
        if (p.laps && p.laps.length > 0) {
            
            // DEDUPLIKATION direkt hier !!!
            const lapMap = new Map();
            for (const lap of p.laps) {
                const ln = lap.lapNumber;
                if (!lapMap.has(ln)) {
                    lapMap.set(ln, { ...lap });
                } else {
                    const existing = lapMap.get(ln);
                    if (lap.lapTimeMs && lap.lapTimeMs > existing.lapTimeMs) existing.lapTimeMs = lap.lapTimeMs;
                    if (lap.sector1Ms && (!existing.sector1Ms || lap.sector1Ms > existing.sector1Ms)) existing.sector1Ms = lap.sector1Ms;
                    if (lap.sector2Ms && (!existing.sector2Ms || lap.sector2Ms > existing.sector2Ms)) existing.sector2Ms = lap.sector2Ms;
                    if (lap.sector3Ms && (!existing.sector3Ms || lap.sector3Ms > existing.sector3Ms)) existing.sector3Ms = lap.sector3Ms;
                    if (lap.tyreCompound !== null && lap.tyreCompound !== undefined) existing.tyreCompound = lap.tyreCompound;
                    if (lap.carDamage) existing.carDamage = { ...existing.carDamage, ...lap.carDamage };
                    if (lap.isPitLap) existing.isPitLap = true;
                }
            }

            for (const lap of Array.from(lapMap.values())) {
                const damageJson = lap.carDamage ? JSON.stringify(lap.carDamage) : null;
                lapsToInsert.push({
                    participant_id: partId,
                    lap_number: lap.lapNumber,
                    lap_time_ms: lap.lapTimeMs,
                    is_valid: lap.isValid,
                    sector1_ms: lap.sector1Ms,
                    sector2_ms: lap.sector2Ms,
                    sector3_ms: lap.sector3Ms,
                    tyre_compound: lap.tyreCompound,
                    is_pit_lap: lap.isPitLap || false,
                    car_damage_json: damageJson
                });
            }
        }
    }

    if (lapsToInsert.length > 0) {
        console.log(`Inserting ${lapsToInsert.length} deduplicated laps...`);
        for (let i = 0; i < lapsToInsert.length; i += 100) {
            const chunk = lapsToInsert.slice(i, i + 100);
            await Promise.all(chunk.map(lap => sql`
                INSERT INTO telemetry_laps 
                (participant_id, lap_number, lap_time_ms, is_valid, sector1_ms, sector2_ms, sector3_ms, tyre_compound, is_pit_lap, car_damage_json)
                VALUES (${lap.participant_id}, ${lap.lap_number}, ${lap.lap_time_ms}, ${lap.is_valid}, ${lap.sector1_ms}, ${lap.sector2_ms}, ${lap.sector3_ms}, ${lap.tyre_compound}, ${lap.is_pit_lap}, ${lap.car_damage_json})
            `));
        }
    }

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

    if (payload.incidentLog && payload.incidentLog.length > 0) {
        for (let i = 0; i < payload.incidentLog.length; i += 100) {
            const chunk = payload.incidentLog.slice(i, i + 100);
            await Promise.all(chunk.map(inc => sql`
                INSERT INTO telemetry_incidents (session_id, type, details, vehicle_idx, other_vehicle_idx, lap_num, timestamp)
                VALUES (${sessionId}, ${inc.type}, ${inc.details}, ${inc.vehicleIdx ?? null}, ${inc.otherVehicleIdx ?? null}, ${inc.lapNum ?? null}, to_timestamp(${inc.timestamp} / 1000.0))
            `));
        }
    }
}

async function runUpload() {
    const races = await sql`SELECT id, track FROM races WHERE league_id = (SELECT id FROM leagues WHERE name ILIKE '%Kleosa%')`;
    const ausRace = races.find(r => r.track.includes('Australia'));
    const chinaRace = races.find(r => r.track.includes('China'));
    
    if (!ausRace || !chinaRace) {
        console.error("Konnte Rennen nicht finden. Vorhanden:", races);
        return;
    }
    
    const recDir = path.join(process.cwd(), '..', 'recordings');
    
    const ausFile = path.join(recDir, 'session_14668411044586209823_2026-03-11T20-14-35-318Z.bin');
    await processFile(ausFile, ausRace.id);
    
    const chinaFile = path.join(recDir, 'session_4727042711014586294_2026-03-18T20-48-51-728Z.bin');
    await processFile(chinaFile, chinaRace.id);

    console.log("\nAlles fertig!");
}

runUpload().catch(console.error);
