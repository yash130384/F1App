import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { AppConfig } from './index';
import { SessionState } from './state';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseMotionData } from './parsers/motionData';
import { parseMotionExData } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import { prompt } from 'enquirer';

export async function fastProcessRecordings(config: AppConfig) {
    console.log('\n--- 🚀 Fast Recording Processor ---');
    const recDir = path.join(process.cwd(), 'recordings');
    const rootRecDir = path.join(process.cwd(), '..', 'recordings');
    
    let targetDir = fs.existsSync(recDir) ? recDir : (fs.existsSync(rootRecDir) ? rootRecDir : null);

    if (!targetDir) {
        console.error('Kein "recordings" Ordner gefunden.');
        return;
    }

    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.bin'));
    if (files.length === 0) {
        console.error(`Keine .bin Dateien in ${targetDir} gefunden.`);
        return;
    }

    const response = await prompt<any>({
        type: 'multiselect',
        name: 'selectedFiles',
        message: 'Wähle Aufzeichnungen zum Verarbeiten (Leertaste zum Wählen):',
        choices: files
    });

    if (response.selectedFiles.length === 0) return;

    for (const fileName of response.selectedFiles) {
        const filePath = path.join(targetDir, fileName);
        console.log(`\nVerarbeite ${fileName}...`);
        await processFile(filePath, config);
    }

    console.log('\n✅ Alle Dateien verarbeitet.');
}

async function processFile(filePath: string, config: AppConfig) {
    const state = new SessionState();
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    
    let offset = 0;
    let packetCount = 0;
    let chunkCount = 0;
    const CHUNK_SIZE = 1000; // Sende alle 1000 Pakete einen Stand

    const buffer = Buffer.alloc(2000); // Max packet size

    while (offset < stats.size) {
        // [4B Preamble][2B Length]
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;

        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) {
            console.error(`Ungültige Pakeltlänge bei Offset ${offset}: ${length}`);
            break;
        }

        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;

        handlePacket(packetBuffer, state);
        packetCount++;

        // Regelmäßig senden
        if (packetCount % CHUNK_SIZE === 0) {
            await sendChunk(state, config);
            chunkCount++;
            process.stdout.write(`\rPakete: ${packetCount} | Chunks gesendet: ${chunkCount}`);
        }
    }

    // Finale Übermittlung falls Session noch aktiv (und Sitzungsende signalisieren)
    await sendChunk(state, config, true);
    fs.closeSync(fd);
    console.log(`\nFertig: ${packetCount} Pakete verarbeitet.`);
}

function handlePacket(msg: Buffer, state: SessionState) {
    if (msg.length < 29) return;
    try {
        const header = parseHeader(msg);

        switch (header.packetId) {
            case 0: { 
                const motionArray = parseMotionData(msg);
                motionArray.forEach((m, i) => state.updateMotion(i, m));
                break;
            }
            case 1: { 
                const sessionData = parseSession(msg);
                state.updateSession(sessionData);
                break;
            }
            case 2: { 
                const lapDataArray = parseLapData(msg);
                lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                break;
            }
            case 3: { 
                const eventData = parseEventData(msg);
                if (eventData.eventStringCode === 'SEND') {
                    state.handleSessionEnd();
                } else {
                    state.handleEvent(eventData);
                }
                break;
            }
            case 4: { 
                const participantsData = parseParticipants(msg);
                participantsData.forEach((p, i) => state.updateParticipant(i, p));
                break;
            }
            case 6: { 
                const telemetryData = parseTelemetry(msg);
                telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                break;
            }
            case 7: { 
                const carStatusArray = parseCarStatus(msg);
                carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                break;
            }
            case 10: { 
                const carDamageArray = parseCarDamage(msg);
                carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                break;
            }
            case 11: { 
                const motionEx = parseMotionExData(msg);
                state.updateMotionEx(header.playerCarIndex, motionEx);
                break;
            }
            case 15: { 
                state.updateLapPositions(msg);
                break;
            }
            case 20: { 
                const tyreData = parseTyreSets(msg);
                state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                break;
            }
        }
    } catch (e) {}
}

async function sendChunk(state: SessionState, config: AppConfig, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    
    // Nur senden, wenn relevante Daten da sind (Sitzung aktiv & Teilnehmer)
    if (!payload.isActive && !isFinal) return;
    if (payload.participants.length === 0 && !isFinal) return;

    if (isFinal) {
        payload.isSessionEnded = true;
    }

    const body = {
        leagueId: config.leagueId,
        packet: payload,
        force: true
    };

    try {
        const res = await fetch(config.url!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            timeout: 30000 // Mehr Zeit für finale Session-Promotion
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`\n❌ API Fehler (${res.status}): ${errText.substring(0, 100)}`);
        }
    } catch (e: any) {
        console.error(`\n❌ Netzwerkfehler beim Senden: ${e.message}`);
    }
}
