import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { AppConfig } from './types/config';
import { SessionState } from './state';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseCarTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseSessionHistory } from './parsers/sessionHistory';
import { parseMotionData } from './parsers/motionData';
import { parseMotionEx } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;
import { ReprocessDashboard } from './reprocessDashboard';
import { setSenderLogger } from './sender';
import { DirectDbSender } from './directDbSender';

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
    const choices = ['[ ALL FILES ]', ...files];
    const response = await prompt<any>({
        type: 'multiselect',
        name: 'selectedFiles',
        message: 'Wähle Aufzeichnungen zum Verarbeiten (Leertaste zum Wählen, "[ ALL FILES ]" für alles):',
        choices: choices
    });

    if (!response || !response.selectedFiles || response.selectedFiles.length === 0) return;

    let filesToProcess = response.selectedFiles;
    if (filesToProcess.includes('[ ALL FILES ]')) {
        filesToProcess = files;
    }

    // Initialisiere Dashboard
    const dashboard = new ReprocessDashboard(filesToProcess);
    dashboard.start();

    // Direkter Datenbank-Sender (überspringt API)
    const dbSender = new DirectDbSender(config.leagueId!);

    let current = 1;
    for (const fileName of filesToProcess) {
        if (fileName === '[ ALL FILES ]') continue;
        const filePath = path.join(targetDir, fileName);
        
        dashboard.setStatus(fileName, 'processing');
        try {
            await processFile(filePath, config, dashboard, dbSender);
            dashboard.setStatus(fileName, 'done');
            dashboard.log(`${fileName} erfolgreich verarbeitet.`, 'success');
        } catch (e: any) {
            dashboard.setStatus(fileName, 'error', e.message);
            dashboard.log(`Fehler bei ${fileName}: ${e.message}`, 'error');
        }
        current++;
    }

    dashboard.log('Alle Dateien verarbeitet.', 'success');
}

/**
 * Liest eine einzelne Binärdatei ein und verarbeitet die enthaltenen Pakete.
 * 
 * @param filePath Absoluter Pfad zur .bin-Datei.
 * @param config Die globale Anwendungskonfiguration.
 * @param dashboard Das UI-Dashboard zur Fortschrittsanzeige.
 */
async function processFile(filePath: string, config: AppConfig, dashboard: ReprocessDashboard, dbSender: DirectDbSender) {
    const fileName = path.basename(filePath);
    const state = new SessionState();
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    
    let offset = 0;
    let packetCount = 0;
    const CHUNK_SIZE = 1500; // Größere Chunks für DB direkt (Neon verträgt das gut)

    while (offset < stats.size) {
        // Binaär-Präfix lesen: [4B Preamble "F125"][2B Length]
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;

        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) {
            break;
        }

        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;

        // Paket parsen und State aktualisieren
        handlePacket(packetBuffer, state);
        packetCount++;

        // Regelmäßig Zwischenstände senden
        if (packetCount % CHUNK_SIZE === 0) {
            await sendToDb(state, dbSender, false);
            
            // Fortschrittsberechnung
            const progress = (offset / stats.size) * 100;
            dashboard.updateProgress(fileName, progress);
        }
    }

    // Finale Übermittlung
    await sendToDb(state, dbSender, true);
    fs.closeSync(fd);
    dashboard.updateProgress(fileName, 100);
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
                participantsData.participants.forEach((p, i) => state.updateParticipant(i, p));
                break;
            }
            case 6: { // Telemetry
                const telemetryData = parseCarTelemetry(msg);
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
                const sessionHistory = parseSessionHistory(msg);
                state.updateSessionHistory(sessionHistory);
                break;
            }
            case 13: { // MotionEx
                const motionEx = parseMotionEx(msg);
                state.updateMotionEx(header.playerCarIndex, motionEx);
                break;
            }
            case 5: { // Car Setups
                // Wir nutzen hier require/import falls der Parser existiert
                try {
                    const { parseCarSetups } = require('./parsers/carSetups');
                    const setups = parseCarSetups(msg);
                    setups.forEach((s: any, i: number) => state.updateCarSetup(i, s));
                } catch(e) {}
                break;
            }
            case 8: { // Final Classification
                try {
                    const { parseFinalClassificationData } = require('./parsers/finalClassification');
                    const classification = parseFinalClassificationData(msg, header);
                    state.updateFinalClassification(classification);
                } catch(e) {}
                break;
            }
            case 12: // Tyre Sets (F1 24/23)
            case 20: { // Tyre Sets (F1 25)
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
 * @param dashboard Optionales Dashboard für Error-Logging.
 */
/**
 * Transformiert den State und sendet ihn direkt an die Datenbank via DirectDbSender.
 */
async function sendToDb(state: SessionState, dbSender: DirectDbSender, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    
    // Validierung: Senden nur wenn die Session aktiv ist oder es das finale Paket ist
    if (!payload.isActive && !isFinal) return;
    if (payload.participants.length === 0 && !isFinal) return;

    if (isFinal) {
        payload.isSessionEnded = true;
    }

    try {
        await dbSender.processPayload(payload);
    } catch (e: any) {
        throw new Error(`DB-Verarbeitungsfehler: ${e.message}`);
    }
}
