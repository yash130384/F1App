"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastProcessRecordings = fastProcessRecordings;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const state_1 = require("./state");
const header_1 = require("./parsers/header");
const session_1 = require("./parsers/session");
const participants_1 = require("./parsers/participants");
const lapData_1 = require("./parsers/lapData");
const telemetry_1 = require("./parsers/telemetry");
const carStatus_1 = require("./parsers/carStatus");
const eventData_1 = require("./parsers/eventData");
const carDamage_1 = require("./parsers/carDamage");
const sessionHistory_1 = require("./parsers/sessionHistory");
const motionData_1 = require("./parsers/motionData");
const motionEx_1 = require("./parsers/motionEx");
const tyreSets_1 = require("./parsers/tyreSets");
const enquirer_1 = require("enquirer");
/**
 * Der FastProcessor ermöglicht die nachträgliche Verarbeitung von .bin-Aufzeichnungen.
 * Er simuliert einen extrem schnellen UDP-Stream, indem er die Pakete aus einer Datei liest,
 * in den SessionState speist und in großen Blöcken (Chunks) an die API sendet.
 *
 * @param config Die globale Anwendungskonfiguration.
 */
async function fastProcessRecordings(config) {
    console.log('\n--- 🚀 Fast Recording Processor ---');
    // Pfadsuch-Logik für den "recordings" Ordner
    const recDir = path_1.default.join(process.cwd(), 'recordings');
    const rootRecDir = path_1.default.join(process.cwd(), '..', 'recordings');
    let targetDir = fs_1.default.existsSync(recDir) ? recDir : (fs_1.default.existsSync(rootRecDir) ? rootRecDir : null);
    if (!targetDir) {
        console.error('Kein "recordings" Ordner gefunden.');
        return;
    }
    const files = fs_1.default.readdirSync(targetDir).filter(f => f.endsWith('.bin'));
    if (files.length === 0) {
        console.error(`Keine .bin Dateien in ${targetDir} gefunden.`);
        return;
    }
    // Interaktive Auswahl der zu verarbeitenden Dateien
    const response = await (0, enquirer_1.prompt)({
        type: 'multiselect',
        name: 'selectedFiles',
        message: 'Wähle Aufzeichnungen zum Verarbeiten (Leertaste zum Wählen):',
        choices: files
    });
    if (response.selectedFiles.length === 0)
        return;
    for (const fileName of response.selectedFiles) {
        const filePath = path_1.default.join(targetDir, fileName);
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
async function processFile(filePath, config) {
    const state = new state_1.SessionState();
    const stats = fs_1.default.statSync(filePath);
    const fd = fs_1.default.openSync(filePath, 'r');
    let offset = 0;
    let packetCount = 0;
    let chunkCount = 0;
    const CHUNK_SIZE = 1000; // Sende alle 1000 Pakete einen Stand an die API
    while (offset < stats.size) {
        // Binaär-Präfix lesen: [4B Preamble "F125"][2B Length]
        const headerBuffer = Buffer.alloc(6);
        fs_1.default.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;
        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) {
            console.error(`Ungültige Paketlänge bei Offset ${offset}: ${length}`);
            break;
        }
        const packetBuffer = Buffer.alloc(length);
        fs_1.default.readSync(fd, packetBuffer, 0, length, offset);
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
    fs_1.default.closeSync(fd);
    console.log(`\nFertig: ${packetCount} Pakete verarbeitet.`);
}
/**
 * Delegiert ein einzelnes UDP-Paket an den entsprechenden Parser und aktualisiert den State.
 */
function handlePacket(msg, state) {
    if (msg.length < 24)
        return; // Mindestlänge für F1 2024/25 Header
    try {
        const header = (0, header_1.parseHeader)(msg);
        switch (header.packetId) {
            case 0: { // Motion
                const motionArray = (0, motionData_1.parseMotionData)(msg);
                motionArray.forEach((m, i) => state.updateMotion(i, m));
                break;
            }
            case 1: { // Session
                const sessionData = (0, session_1.parseSession)(msg);
                state.updateSession(sessionData);
                break;
            }
            case 2: { // Lap Data
                const lapDataArray = (0, lapData_1.parseLapData)(msg);
                lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                break;
            }
            case 3: { // Event
                const eventData = (0, eventData_1.parseEventData)(msg);
                if (eventData.eventStringCode === 'SEND') {
                    state.handleSessionEnd();
                }
                else {
                    state.handleEvent(eventData);
                }
                break;
            }
            case 4: { // Participants
                const participantsData = (0, participants_1.parseParticipants)(msg);
                participantsData.forEach((p, i) => state.updateParticipant(i, p));
                break;
            }
            case 6: { // Telemetry
                const telemetryData = (0, telemetry_1.parseTelemetry)(msg);
                telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                break;
            }
            case 7: { // Car Status
                const carStatusArray = (0, carStatus_1.parseCarStatus)(msg);
                carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                break;
            }
            case 10: { // Car Damage
                const carDamageArray = (0, carDamage_1.parseCarDamage)(msg);
                carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                break;
            }
            case 11: { // Session History
                const sessionHistory = (0, sessionHistory_1.parseSessionHistoryData)(msg, header);
                state.updateSessionHistory(sessionHistory);
                break;
            }
            case 13: { // MotionEx
                const motionEx = (0, motionEx_1.parseMotionExData)(msg);
                state.updateMotionEx(header.playerCarIndex, motionEx);
                break;
            }
            case 20: { // Tyre Sets
                const tyreData = (0, tyreSets_1.parseTyreSets)(msg);
                state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                break;
            }
        }
    }
    catch (e) {
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
async function sendChunk(state, config, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    // Validierung: Senden nur wenn die Session aktiv ist oder es das finale Paket ist
    if (!payload.isActive && !isFinal)
        return;
    if (payload.participants.length === 0 && !isFinal)
        return;
    if (isFinal) {
        payload.isSessionEnded = true;
    }
    const body = {
        leagueId: config.leagueId,
        packet: payload,
        force: true // Signalisiert der API, dass die Daten priorisiert verarbeitet werden sollen
    };
    try {
        const res = await (0, node_fetch_1.default)(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            timeout: 60000 // Hoher Timeout für die finale DB-Verarbeitung (Promotion)
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error(`\n❌ API Fehler (${res.status}): ${errText.substring(0, 100)}`);
        }
    }
    catch (e) {
        console.error(`\n❌ Netzwerkfehler beim Senden: ${e.message}`);
    }
}
