import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { AppConfig } from './types/config';
import { SessionState } from './state';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseSessionHistoryData } from './parsers/sessionHistory';
import { parseMotionData } from './parsers/motionData';
import { parseMotionExData } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;

/**
 * Der FastProcessor ermöglicht die nachträgliche Verarbeitung von .bin-Aufzeichnungen.
 * Er simuliert einen extrem schnellen UDP-Stream, indem er die Pakete aus einer Datei liest,
 * in den SessionState speist und in großen Blöcken (Chunks) an die API sendet.
 * 
 * @param config Die globale Anwendungskonfiguration.
 */
export async function fastProcessRecordings(config: AppConfig) {
    console.log('\n--- 🚀 Fast Recording Processor ---');
    
    // Pfadsuch-Logik für den "recordings" Ordner
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

    // Interaktive Auswahl der zu verarbeitenden Dateien
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

/**
 * Liest eine einzelne Binärdatei ein und verarbeitet die enthaltenen Pakete.
 * 
 * @param filePath Absoluter Pfad zur .bin-Datei.
 * @param config Die globale Anwendungskonfiguration.
 */
async function processFile(filePath: string, config: AppConfig) {
    const state = new SessionState();
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    
    let offset = 0;
    let packetCount = 0;
    let chunkCount = 0;
    const CHUNK_SIZE = 1000; // Sende alle 1000 Pakete einen Stand an die API

    while (offset < stats.size) {
        // Binaär-Präfix lesen: [4B Preamble "F125"][2B Length]
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;

        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) {
            console.error(`Ungültige Paketlänge bei Offset ${offset}: ${length}`);
            break;
        }

        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;

        // Paket parsen und State aktualisieren
        handlePacket(packetBuffer, state);
        packetCount++;

        // Regelmäßig Zwischenstände senden, um Speicher zu entlasten
        if (packetCount % CHUNK_SIZE === 0) {
            await sendChunk(state, config);
            chunkCount++;
            process.stdout.write(`\rPakete: ${packetCount} | Chunks gesendet: ${chunkCount}`);
        }
    }

    // Finale Übermittlung nach Dateiende (wichtig für Session-Promotion in der DB)
    await sendChunk(state, config, true);
    fs.closeSync(fd);
    console.log(`\nFertig: ${packetCount} Pakete verarbeitet.`);
}

/**
 * Delegiert ein einzelnes UDP-Paket an den entsprechenden Parser und aktualisiert den State.
 */
function handlePacket(msg: Buffer, state: SessionState) {
    if (msg.length < 24) return; // Mindestlänge für F1 2024/25 Header
    
    try {
        const header = parseHeader(msg);

        switch (header.packetId) {
            case 0: { // Motion
                const motionArray = parseMotionData(msg);
                motionArray.forEach((m, i) => state.updateMotion(i, m));
                break;
            }
            case 1: { // Session
                const sessionData = parseSession(msg);
                state.updateSession(sessionData);
                break;
            }
            case 2: { // Lap Data
                const lapDataArray = parseLapData(msg);
                lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                break;
            }
            case 3: { // Event
                const eventData = parseEventData(msg);
                if (eventData.eventStringCode === 'SEND') {
                    state.handleSessionEnd();
                } else {
                    state.handleEvent(eventData);
                }
                break;
            }
            case 4: { // Participants
                const participantsData = parseParticipants(msg);
                participantsData.forEach((p, i) => state.updateParticipant(i, p));
                break;
            }
            case 6: { // Telemetry
                const telemetryData = parseTelemetry(msg);
                telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                break;
            }
            case 7: { // Car Status
                const carStatusArray = parseCarStatus(msg);
                carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                break;
            }
            case 10: { // Car Damage
                const carDamageArray = parseCarDamage(msg);
                carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                break;
            }
            case 11: { // Session History
                const sessionHistory = parseSessionHistoryData(msg, header);
                state.updateSessionHistory(sessionHistory);
                break;
            }
            case 13: { // MotionEx
                const motionEx = parseMotionExData(msg);
                state.updateMotionEx(header.playerCarIndex, motionEx);
                break;
            }
            case 20: { // Tyre Sets
                const tyreData = parseTyreSets(msg);
                state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                break;
            }
        }
    } catch (e) {
        // Fehler beim Parsen einzelner Pakete werden im Fast-Process ignoriert
    }
}

/**
 * Transformiert den State und sendet ihn via HTTP POST an die API.
 * 
 * @param state Der aktuelle SessionState.
 * @param config Die globale Konfiguration.
 * @param isFinal Ob dies die letzte Übermittlung der Datei ist.
 */
async function sendChunk(state: SessionState, config: AppConfig, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    
    // Validierung: Senden nur wenn die Session aktiv ist oder es das finale Paket ist
    if (!payload.isActive && !isFinal) return;
    if (payload.participants.length === 0 && !isFinal) return;

    if (isFinal) {
        payload.isSessionEnded = true;
    }

    const body = {
        leagueId: config.leagueId,
        packet: payload,
        force: true // Signalisiert der API, dass die Daten priorisiert verarbeitet werden sollen
    };

    try {
        const res = await fetch(config.url!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            timeout: 60000 // Hoher Timeout für die finale DB-Verarbeitung (Promotion)
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`\n❌ API Fehler (${res.status}): ${errText.substring(0, 100)}`);
        }
    } catch (e: any) {
        console.error(`\n❌ Netzwerkfehler beim Senden: ${e.message}`);
    }
}
