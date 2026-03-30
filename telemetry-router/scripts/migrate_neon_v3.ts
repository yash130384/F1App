import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

// Import parsers from telemetry-router/src/parsers/
import { parseHeader } from '../src/parsers/header.ts';
import { parseSession } from '../src/parsers/session.ts';
import { parseParticipants } from '../src/parsers/participants.ts';
import { parseLapData } from '../src/parsers/lapData.ts';
import { parseTelemetry } from '../src/parsers/telemetry.ts';
import { parseCarStatus } from '../src/parsers/carStatus.ts';
import { parseEventData } from '../src/parsers/eventData.ts';
import { parseCarDamage } from '../src/parsers/carDamage.ts';
import { parseSessionHistoryData } from '../src/parsers/sessionHistory.ts';
import { parseMotionData } from '../src/parsers/motionData.ts';
import { parseMotionExData } from '../src/parsers/motionEx.ts';
import { parseTyreSets } from '../src/parsers/tyreSets.ts';
import { SessionState } from '../src/state.ts';

dotenv.config({ path: '../.env' });

const sql = neon(process.env.DATABASE_URL);
const leagueId = '70133e74-2fd4-4b2d-ada5-069343dc26c0'; // Kleosa Season1

const FILE_MAP = [
    { 
        file: 'session_14668411044586209823_2026-03-11T20-14-35-318Z.bin',
        raceId: 'fae32427-d234-4477-807c-0861ce7203fd',
        track: 'Melbourne'
    },
    { 
        file: 'session_4727042711014586294_2026-03-18T20-48-51-728Z.bin',
        raceId: 'f2dc30df-7540-4b91-869a-dcacda9a143d',
        track: 'Shanghai'
    },
    { 
        file: '_temp_session_7053247387223461260_2026-03-25T21-32-22-778Z.bin',
        raceId: 'd07e3180-559a-4878-b08d-d88252a19640',
        track: 'Brazil'
    }
];

function pg(sqlStr) {
    let counter = 1;
    return sqlStr.replace(/\?/g, () => `$${counter++}`);
}

async function runQuery(sqlStr, params = []) {
    try {
        const res = await sql.query(pg(sqlStr), params);
        if (Array.isArray(res)) return res;
        if (res && res.rows) return res.rows;
        return [];
    } catch (err) {
        console.error(`\n❌ SQL Error: ${err.message}`);
        console.error(`Query: ${sqlStr}`);
        throw err;
    }
}

async function migrate() {
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
    });

    console.log('--- 🚀 Starting Telemetry Migration to Neon ---');

    for (const mapping of FILE_MAP) {
        const filePath = path.join('../recordings', mapping.file);
        if (!fs.existsSync(filePath)) {
            console.error(`Missing file: ${filePath}`);
            continue;
        }

        console.log(`\nProcessing: ${mapping.track} (${mapping.file})`);
        
        const state = new SessionState();
        const sessionId = crypto.randomUUID();
        const stats = fs.statSync(filePath);
        const fd = fs.openSync(filePath, 'r');
        
        let offset = 0;
        let packetCount = 0;

        await runQuery(
            `INSERT INTO telemetry_sessions (id, league_id, race_id, track_id, session_type, is_active) VALUES (?, ?, ?, ?, ?, true)`,
            [sessionId, leagueId, mapping.raceId, 0, 'Race']
        );

        while (offset < stats.size) {
            const headerBuffer = Buffer.alloc(6);
            if (fs.readSync(fd, headerBuffer, 0, 6, offset) < 6) break;
            offset += 6;

            const length = headerBuffer.readUInt16LE(4);
            const packetBuffer = Buffer.alloc(length);
            fs.readSync(fd, packetBuffer, 0, length, offset);
            offset += length;

            handlePacket(packetBuffer, state);
            packetCount++;

            if (packetCount % 5000 === 0) {
                await flushStateToDb(sessionId, state);
                process.stdout.write(`\rPackets: ${packetCount}`);
            }
        }

        await flushStateToDb(sessionId, state, true);
        console.log(`\n✅ Finished ${mapping.track}. Promoting to results...`);
        await promoteSession(sessionId, leagueId, mapping.track, mapping.raceId);
        fs.closeSync(fd);
    }
    console.log('\n--- 🎉 All migrations completed! ---');
}

function handlePacket(msg, state) {
    if (msg.length < 24) return;
    try {
        const header = parseHeader(msg);
        switch (header.packetId) {
            case 0: parseMotionData(msg).forEach((m, i) => state.updateMotion(i, m)); break;
            case 1: state.updateSession(parseSession(msg)); break;
            case 2: parseLapData(msg).forEach((l, i) => state.updateLapData(i, l)); break;
            case 3: state.handleEvent(parseEventData(msg)); break;
            case 4: parseParticipants(msg).forEach((p, i) => state.updateParticipant(i, p)); break;
            case 6: parseTelemetry(msg).forEach((t, i) => state.updateTelemetry(i, t)); break;
            case 7: parseCarStatus(msg).forEach((cs, i) => state.updateCarStatus(i, cs)); break;
            case 10: parseCarDamage(msg).forEach((cd, i) => state.updateCarDamage(i, cd)); break;
            case 11: state.updateSessionHistory(parseSessionHistoryData(msg, header)); break;
            case 13: state.updateMotionEx(header.playerCarIndex, parseMotionExData(msg)); break;
            case 20:
            case 12: {
                const td = parseTyreSets(msg);
                state.updateTyreSets(td.carIdx, td.tyreSetData);
                break;
            }
        }
    } catch (e) {}
}

async function flushStateToDb(sessionId, state, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    if (!payload.isActive && !isFinal) return;

    await runQuery(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP, track_length = ?, stays_active = ? WHERE id = ?`, 
        [payload.trackLength, !isFinal, sessionId]).catch(() => {
            // Fallback column name check
             return runQuery(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP, track_length = ?, is_active = ? WHERE id = ?`, 
                [payload.trackLength, !isFinal, sessionId]);
        });

    if (payload.participants && Array.isArray(payload.participants)) {
        for (const p of payload.participants) {
            const drivers = await runQuery(`SELECT id FROM drivers WHERE league_id = ? AND game_name = ?`, [leagueId, p.gameName]);
            const driverId = drivers.length > 0 ? drivers[0].id : null;

            const upsertPart = `
                INSERT INTO telemetry_participants 
                (id, session_id, game_name, driver_id, team_id, start_position, position, lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time, car_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id, game_name) DO UPDATE SET
                    position = EXCLUDED.position,
                    lap_distance = EXCLUDED.lap_distance,
                    top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END,
                    pit_stops = EXCLUDED.pit_stops,
                    warnings = EXCLUDED.warnings,
                    penalties_time = EXCLUDED.penalties_time
                RETURNING id
            `;
            const partRow = await runQuery(upsertPart, [
                crypto.randomUUID(), sessionId, p.gameName, driverId, p.teamId, p.startPosition, p.position, p.lapDistance, p.topSpeedKmh, p.isHuman, p.pitStops || 0, p.warnings || 0, p.penaltiesTime || 0, p.carIndex
            ]);

            if (partRow.length > 0 && p.isHuman) {
                const participantId = partRow[0].id;
                if (p.laps && Array.isArray(p.laps)) {
                    for (const lap of p.laps) {
                        const existingLap = await runQuery(`SELECT id FROM telemetry_laps WHERE participant_id = ? AND lap_number = ?`, [participantId, lap.lapNumber]);
                        if (existingLap.length === 0) {
                            await runQuery(
                                `INSERT INTO telemetry_laps (id, participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [crypto.randomUUID(), participantId, lap.lapNumber, lap.lapTimeMs, !!lap.isValid, lap.tyreCompound || null, !!lap.isPitLap, lap.sector1Ms || null, lap.sector2Ms || null, lap.sector3Ms || null]
                            );
                        }
                    }
                }
            }
        }
    }
}

async function promoteSession(sessionId, leagueId, track, raceId) {
    const participants = await runQuery(
        `SELECT tp.*, 
        (SELECT MIN(lap_time_ms) FROM telemetry_laps tl WHERE tl.participant_id = tp.id AND tl.is_valid = true AND tl.lap_time_ms > 0) as fastest_lap_ms
        FROM telemetry_participants tp 
        WHERE tp.session_id = ? AND tp.driver_id IS NOT NULL
        ORDER BY tp.position ASC`,
        [sessionId]
    );

    if (participants.length === 0) return;

    let minLap = Infinity;
    let fastestDriverId = null;
    for (const p of participants) {
        if (p.fastest_lap_ms && p.fastest_lap_ms < minLap) {
            minLap = p.fastest_lap_ms;
            fastestDriverId = p.driver_id;
        }
    }

    await runQuery(`UPDATE races SET is_finished = true, race_date = CURRENT_TIMESTAMP WHERE id = ?`, [raceId]);

    const configs = await runQuery(`SELECT points_json FROM points_config WHERE league_id = ?`, [leagueId]);
    let pointsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    try { if (configs.length > 0) pointsTable = JSON.parse(configs[0].points_json); } catch(e) {}

    for (const p of participants) {
        const pos = p.position || 21;
        const pts = pointsTable[pos - 1] || 0;
        const flBonus = (p.driver_id === fastestDriverId && pos <= 10) ? 1 : 0;
        
        await runQuery(
            `INSERT INTO race_results (id, race_id, driver_id, position, quali_position, fastest_lap, clean_driver, points_earned, pit_stops, warnings, penalties_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), raceId, p.driver_id, pos, p.start_position, p.driver_id === fastestDriverId, (p.warnings === 0), pts + flBonus, p.pitStops, p.warnings, p.penaltiesTime]
        );
    }
}

migrate().catch(console.error);
