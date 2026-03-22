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
async function fastProcessRecordings(config) {
    console.log('\n--- 🚀 Fast Recording Processor ---');
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
async function processFile(filePath, config) {
    const state = new state_1.SessionState();
    const stats = fs_1.default.statSync(filePath);
    const fd = fs_1.default.openSync(filePath, 'r');
    let offset = 0;
    let packetCount = 0;
    let chunkCount = 0;
    const CHUNK_SIZE = 1000; // Sende alle 1000 Pakete einen Stand
    const buffer = Buffer.alloc(2000); // Max packet size
    while (offset < stats.size) {
        // [4B Preamble][2B Length]
        const headerBuffer = Buffer.alloc(6);
        fs_1.default.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;
        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) {
            console.error(`Ungültige Pakeltlänge bei Offset ${offset}: ${length}`);
            break;
        }
        const packetBuffer = Buffer.alloc(length);
        fs_1.default.readSync(fd, packetBuffer, 0, length, offset);
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
    fs_1.default.closeSync(fd);
    console.log(`\nFertig: ${packetCount} Pakete verarbeitet.`);
}
function handlePacket(msg, state) {
    if (msg.length < 29)
        return;
    try {
        const header = (0, header_1.parseHeader)(msg);
        switch (header.packetId) {
            case 0: {
                const motionArray = (0, motionData_1.parseMotionData)(msg);
                motionArray.forEach((m, i) => state.updateMotion(i, m));
                break;
            }
            case 1: {
                const sessionData = (0, session_1.parseSession)(msg);
                state.updateSession(sessionData);
                break;
            }
            case 2: {
                const lapDataArray = (0, lapData_1.parseLapData)(msg);
                lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                break;
            }
            case 3: {
                const eventData = (0, eventData_1.parseEventData)(msg);
                if (eventData.eventStringCode === 'SEND') {
                    state.handleSessionEnd();
                }
                else {
                    state.handleEvent(eventData);
                }
                break;
            }
            case 4: {
                const participantsData = (0, participants_1.parseParticipants)(msg);
                participantsData.forEach((p, i) => state.updateParticipant(i, p));
                break;
            }
            case 6: {
                const telemetryData = (0, telemetry_1.parseTelemetry)(msg);
                telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                break;
            }
            case 7: {
                const carStatusArray = (0, carStatus_1.parseCarStatus)(msg);
                carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                break;
            }
            case 10: {
                const carDamageArray = (0, carDamage_1.parseCarDamage)(msg);
                carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                break;
            }
            case 11: {
                const sessionHistory = (0, sessionHistory_1.parseSessionHistoryData)(msg, header);
                state.updateSessionHistory(sessionHistory);
                break;
            }
            case 13: {
                const motionEx = (0, motionEx_1.parseMotionExData)(msg);
                state.updateMotionEx(header.playerCarIndex, motionEx);
                break;
            }
            case 15: {
                state.updateLapPositions(msg);
                break;
            }
            case 20: {
                const tyreData = (0, tyreSets_1.parseTyreSets)(msg);
                state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                break;
            }
        }
    }
    catch (e) { }
}
async function sendChunk(state, config, isFinal = false) {
    const payload = state.buildPayloadAndClear();
    // Nur senden, wenn relevante Daten da sind (Sitzung aktiv & Teilnehmer)
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
        force: true
    };
    try {
        const res = await (0, node_fetch_1.default)(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            timeout: 30000 // Mehr Zeit für finale Session-Promotion
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
