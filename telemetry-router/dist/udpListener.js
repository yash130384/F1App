"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startUdpListener = startUdpListener;
const dgram_1 = __importDefault(require("dgram"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const header_1 = require("./parsers/header");
const session_1 = require("./parsers/session");
const participants_1 = require("./parsers/participants");
const lapData_1 = require("./parsers/lapData");
const telemetry_1 = require("./parsers/telemetry");
const carStatus_1 = require("./parsers/carStatus");
const eventData_1 = require("./parsers/eventData");
const carDamage_1 = require("./parsers/carDamage");
const motionData_1 = require("./parsers/motionData");
const sessionHistory_1 = require("./parsers/sessionHistory");
const finalClassification_1 = require("./parsers/finalClassification");
const motionEx_1 = require("./parsers/motionEx");
const tyreSets_1 = require("./parsers/tyreSets");
const state_1 = require("./state");
const sender_1 = require("./sender");
const dashboard_1 = require("./dashboard");
/**
 * Startet den UDP-Listener, der auf Pakete vom Spiel (F1 25) wartet.
 * Diese Funktion verwaltet den Socket, die lokale Aufzeichnung (.bin) und delegiert
 * die Paketverarbeitung an den SessionState.
 *
 * @param config Die Anwendungskonfiguration inkl. Port und Sendeintervall.
 */
function startUdpListener(config) {
    if (!config.port) {
        console.error('Kritischer Fehler: Kein UDP-Port in der Konfiguration angegeben.');
        return;
    }
    const server = dgram_1.default.createSocket('udp4');
    const state = new state_1.SessionState();
    // Verzeichnis für lokale Aufzeichnungen sicherstellen
    const recordingsDir = path_1.default.join(process.cwd(), 'recordings');
    if (!fs_1.default.existsSync(recordingsDir)) {
        fs_1.default.mkdirSync(recordingsDir);
    }
    let recordingStream = null;
    let currentSessionUID = 0n;
    let tempRecordingFilename = null;
    let finalRecordingFilename = null;
    let startTimeStr = '';
    // Startet die HTTP-Übermittlungsschleife im Hintergrund
    (0, sender_1.startSender)(config, state);
    // Dashboard-UI alle 500ms im Terminal aktualisieren
    setInterval(() => {
        (0, dashboard_1.renderDashboard)(config, state.getDashboardState());
    }, 500);
    // Fehlerbehandlung für den UDP-Socket
    server.on('error', (err) => {
        console.error(`UDP-Serverfehler (Socket): \n${err.stack}`);
        if (recordingStream) {
            recordingStream.end();
        }
        server.close();
    });
    // Hauptschleife für eingehende UDP-Pakete
    server.on('message', (msg, rinfo) => {
        // Jedes gültige F1-Paket hat mindestens einen 29-Byte Header
        if (msg.length < 29)
            return;
        try {
            const header = (0, header_1.parseHeader)(msg);
            // --- LOKALE AUFZEICHNUNG (BACKUP) ---
            // Wenn eine neue Session-ID erkannt wird, starten wir eine neue Datei.
            if (header.sessionUID !== currentSessionUID) {
                if (recordingStream) {
                    recordingStream.end();
                    recordingStream = null;
                    console.log(`⏹️ Recording für Session ${currentSessionUID} beendet.`);
                }
                currentSessionUID = header.sessionUID;
                tempRecordingFilename = null;
                finalRecordingFilename = null;
                if (currentSessionUID !== 0n) {
                    startTimeStr = new Date().toISOString().replace(/[:.]/g, '-');
                    // Temporäre Datei verwenden, bis wir Track- und Session-Namen kennen
                    tempRecordingFilename = path_1.default.join(recordingsDir, `_temp_session_${currentSessionUID}_${startTimeStr}.bin`);
                    recordingStream = fs_1.default.createWriteStream(tempRecordingFilename, { flags: 'a' });
                    console.log(`🎥 Gestartet: Neues Recording (Temporär: ${path_1.default.basename(tempRecordingFilename)})`);
                }
            }
            // Paket in die lokale Datei schreiben (mit eigenem Mini-Header für die Wiederverarbeitung)
            if (recordingStream && currentSessionUID !== 0n) {
                const fileHeader = Buffer.alloc(6);
                fileHeader.writeUInt32LE(0, 0); // Preamble (0000)
                fileHeader.writeUInt16LE(msg.length, 4); // Reale Paketlänge
                recordingStream.write(fileHeader);
                recordingStream.write(msg);
                // Datei umbenennen auf sprechenden Namen (z.B. Brazil_Race_...), sobald Daten vorliegen
                if (tempRecordingFilename && !finalRecordingFilename && state.trackName !== 'Unknown' && state.sessionType !== 'Unknown') {
                    const humans = state.getHumanCount();
                    // Wir benennen um, wenn wir menschliche Spieler gefunden haben oder genug Daten (1000 Pakete) gesammelt wurden
                    if (humans > 0 || state.packetCount > 1000) {
                        const anzahl = humans > 0 ? humans : 0;
                        const validOrt = state.trackName.replace(/[^a-z0-9]/gi, ''); // Dateisystem-sicherer Name
                        const validSession = state.sessionType.replace(/[^a-z0-9 ]/gi, '').trim().replace(/ /g, '');
                        finalRecordingFilename = path_1.default.join(recordingsDir, `${validOrt}_${validSession}_${startTimeStr}_${anzahl}.bin`);
                        try {
                            fs_1.default.renameSync(tempRecordingFilename, finalRecordingFilename);
                            tempRecordingFilename = null;
                            const newStream = fs_1.default.createWriteStream(finalRecordingFilename, { flags: 'a' });
                            recordingStream.end();
                            recordingStream = newStream;
                            console.log(`✅ Recording Datei präzise benannt: ${path_1.default.basename(finalRecordingFilename)}`);
                        }
                        catch (err) {
                            console.error(`Fehler beim Umbenennen der Recording-Datei: ${err.message}`);
                        }
                    }
                }
            }
            // --- ENDE AUFZEICHNUNGS-LOGIK ---
            // PAKET-VERTEILER basierend auf PacketId
            switch (header.packetId) {
                case 0: { // Motion-Daten: Weltkoordinaten, G-Kräfte, Aufhängung
                    const motionArray = (0, motionData_1.parseMotionData)(msg);
                    motionArray.forEach((m, i) => state.updateMotion(i, m));
                    break;
                }
                case 1: { // Session-Daten: Strecke, Wetter, Session-Typ (Training, Quali, Rennen)
                    const sessionData = (0, session_1.parseSession)(msg);
                    state.updateSession(sessionData);
                    break;
                }
                case 2: { // Rundendaten: Aktuelle Runde, Sektorzeiten, Pit-Status
                    const lapDataArray = (0, lapData_1.parseLapData)(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                }
                case 3: { // Event-Daten: Strafen, Unfälle, Safety-Car, Session-Ende
                    const eventData = (0, eventData_1.parseEventData)(msg);
                    if (eventData.eventStringCode === 'SEND') {
                        console.log('🏁 SESSION BEENDET (SEND-Event empfangen).');
                        state.handleSessionEnd();
                    }
                    else if (eventData.eventStringCode === 'SCAR') {
                        state.addSafetyCarEvent(eventData.safetyCarType ?? 0, eventData.eventType ?? 0);
                    }
                    else {
                        state.handleEvent(eventData);
                    }
                    break;
                }
                case 4: { // Teilnehmer-Daten: Fahrernamen, Teams, KI vs. Mensch
                    const participantsData = (0, participants_1.parseParticipants)(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                }
                case 6: { // Fahrzeug-Telemetrie: Geschwindigkeit, Gas, Bremse, Temperaturen
                    const telemetryData = (0, telemetry_1.parseTelemetry)(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
                }
                case 7: { // Fahrzeug-Status: ERS, Benzin, FIA Flaggen, Reifenmischung
                    const carStatusArray = (0, carStatus_1.parseCarStatus)(msg);
                    carStatusArray.forEach((cs, i) => {
                        state.updateCarStatus(i, cs);
                        // Tracken der globalen Flagge basierend auf dem Spieler-Auto
                        if (i === header.playerCarIndex || (i === 0 && !state.trackFlags)) {
                            state.trackFlags = cs.vehicleFIAFlags;
                        }
                    });
                    break;
                }
                case 8: { // Final Classification: Endergebnis am Ende einer Session
                    const classification = (0, finalClassification_1.parseFinalClassificationData)(msg, header);
                    state.updateFinalClassification(classification);
                    break;
                }
                case 10: { // Fahrzeug-Schäden: Flügel, Unterboden, Motor-Verschleiß
                    const carDamageArray = (0, carDamage_1.parseCarDamage)(msg);
                    carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                    break;
                }
                case 11: { // Session History: Historische Sektorzeiten aller Runden
                    const sessionHistory = (0, sessionHistory_1.parseSessionHistoryData)(msg, header);
                    state.updateSessionHistory(sessionHistory);
                    break;
                }
                case 13: { // Motion Ex: Erweiterte Daten nur für das Spieler-Fahrzeug
                    const motionEx = (0, motionEx_1.parseMotionExData)(msg);
                    state.updateMotionEx(header.playerCarIndex, motionEx);
                    break;
                }
                case 15: { // Lap Positions: Positionshistorie pro Runde (eher selten genutzt)
                    state.updateLapPositions(msg);
                    break;
                }
                case 20: { // Tyre Sets: Verfügbare und genutzte Reifensätze (nur verfügbar in P/Q/R)
                    const tyreData = (0, tyreSets_1.parseTyreSets)(msg);
                    state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                    break;
                }
            }
        }
        catch (e) {
            console.error('Kritischer Fehler beim Verarbeiten eines UDP-Pakets:', e.message);
        }
    });
    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP-Server lauscht auf ${address.address}:${address.port}`);
    });
    // Startet das Binden an den konfigurierten Port
    server.bind(config.port);
}
