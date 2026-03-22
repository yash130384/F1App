import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
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
import dotenv from 'dotenv';

dotenv.config();

const config = {
    leagueId: process.env.LEAGUE_ID || 'MyLeague',
    url: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry',
};

async function run() {
    const recDir = path.join(process.cwd(), '..', 'recordings');
    const files = fs.readdirSync(recDir)
        .filter(f => f.endsWith('.bin'))
        .map(f => ({ name: f, stat: fs.statSync(path.join(recDir, f)) }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

    if (files.length === 0) {
        console.error("No .bin files found.");
        return;
    }

    const targetFile = path.join(recDir, files[0].name);
    console.log(`Processing newest file: ${targetFile}`);

    const state = new SessionState();
    const stats = fs.statSync(targetFile);
    const fd = fs.openSync(targetFile, 'r');
    
    let offset = 0;
    let packetCount = 0;
    const CHUNK_SIZE = 10000;

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
            await sendChunk(state, config);
            process.stdout.write(`\rProcessed: ${packetCount} packets...`);
        }
    }

    await sendChunk(state, config, true);
    fs.closeSync(fd);
    console.log(`\nFinished: ${packetCount} packets processed.`);
}

function handlePacket(msg, state) {
    if (msg.length < 29) return;
    const header = parseHeader(msg);

    switch (header.packetId) {
        case 0: state.updateMotion(header.playerCarIndex, parseMotionData(msg)[header.playerCarIndex]); break; // Simplified for speed
        case 0: { // Motion
            const m = parseMotionData(msg);
            m.forEach((v, i) => state.updateMotion(i, v));
            break;
        }
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

async function sendChunk(state, config, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    if (!payload.isActive && !isFinal) return;
    if (payload.participants.length === 0 && !isFinal) return;
    if (isFinal) payload.isSessionEnded = true;

    const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: config.leagueId, packet: payload, force: true }),
        timeout: 60000
    });
    if (!res.ok) console.error(`\nAPI Error: ${res.status}`);
}

run().catch(console.error);
