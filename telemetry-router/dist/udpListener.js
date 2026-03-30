import dgram from 'dgram';
import fs from 'fs';
import path from 'path';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseMotionData } from './parsers/motionData';
import { parseSessionHistoryData } from './parsers/sessionHistory';
import { parseFinalClassificationData } from './parsers/finalClassification';
import { parseMotionExData } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import { parseCarSetups } from './parsers/carSetups';
import { SessionState } from './state';
import { startSender } from './sender';
/**
 * Startet den UDP-Listener, der auf Pakete vom Spiel (F1 25) wartet.
 * Diese Funktion verwaltet den Socket, die lokale Aufzeichnung (.bin) und delegiert
 * die Paketverarbeitung an den SessionState.
 *
 * @param config Die Anwendungskonfiguration inkl. Port und Sendeintervall.
 * @param onStatusUpdate Callback-Funktion für Statusänderungen (z.B. für Tray-Icon).
 */
export function startUdpListener(config, onStatusUpdate) {
    if (!config.port) {
        console.error('Kritischer Fehler: Kein UDP-Port in der Konfiguration angegeben.');
        return;
    }
    const server = dgram.createSocket('udp4');
    const state = new SessionState();
    // Verzeichnis für lokale Aufzeichnungen sicherstellen
    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir);
    }
    let recordingStream = null;
    let currentSessionUID = BigInt(0);
    let tempRecordingFilename = null;
    let finalRecordingFilename = null;
    let startTimeStr = '';
    // Startet die HTTP-Übermittlungsschleife im Hintergrund
    startSender(config, state);
    // Dashboard-UI deaktiviert (User requested noise reduction)
    /*
    setInterval(() => {
        renderDashboard(config, state.getDashboardState());
    }, 500);
    */
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
            const header = parseHeader(msg);
            // --- LOKALE AUFZEICHNUNG (BACKUP) ---
            if (header.sessionUID !== currentSessionUID) {
                if (recordingStream) {
                    recordingStream.end();
                    recordingStream = null;
                }
                currentSessionUID = header.sessionUID;
                tempRecordingFilename = null;
                finalRecordingFilename = null;
                if (currentSessionUID !== BigInt(0)) {
                    startTimeStr = new Date().toISOString().replace(/[:.]/g, '-');
                    tempRecordingFilename = path.join(recordingsDir, `_temp_session_${currentSessionUID}_${startTimeStr}.bin`);
                    recordingStream = fs.createWriteStream(tempRecordingFilename, { flags: 'a' });
                    console.log(`🎥 Telemetrie-Recording gestartet [UID: ${currentSessionUID}]`);
                }
            }
            // Paket in die lokale Datei schreiben
            if (recordingStream && currentSessionUID !== BigInt(0)) {
                const fileHeader = Buffer.alloc(6);
                fileHeader.writeUInt32LE(0, 0);
                fileHeader.writeUInt16LE(msg.length, 4);
                recordingStream.write(fileHeader);
                recordingStream.write(msg);
                // Datei umbenennen auf sprechenden Namen
                if (tempRecordingFilename && !finalRecordingFilename && state.trackName !== 'Unknown' && state.sessionType !== 'Unknown') {
                    const humans = state.getHumanCount();
                    if (humans > 0 || state.packetCount > 1000) {
                        const anzahl = humans > 0 ? humans : 0;
                        const validOrt = state.trackName.replace(/[^a-z0-9]/gi, '');
                        const validSession = state.sessionType.replace(/[^a-z0-9 ]/gi, '').trim().replace(/ /g, '');
                        finalRecordingFilename = path.join(recordingsDir, `${validOrt}_${validSession}_${startTimeStr}_${anzahl}.bin`);
                        try {
                            fs.renameSync(tempRecordingFilename, finalRecordingFilename);
                            tempRecordingFilename = null;
                            const newStream = fs.createWriteStream(finalRecordingFilename, { flags: 'a' });
                            recordingStream.end();
                            recordingStream = newStream;
                            console.log(`✅ Session identifiziert: ${state.trackName} - ${state.sessionType}`);
                        }
                        catch (err) {
                            console.error(`Fehler beim Umbenennen: ${err.message}`);
                        }
                    }
                }
            }
            // --- ENDE AUFZEICHNUNGS-LOGIK ---
            // PAKET-VERTEILER basierend auf PacketId
            switch (header.packetId) {
                case 0: { // Motion-Daten: Weltkoordinaten, G-Kräfte, Aufhängung
                    const motionArray = parseMotionData(msg);
                    motionArray.forEach((m, i) => state.updateMotion(i, m));
                    break;
                }
                case 1: { // Session-Daten: Strecke, Wetter, Session-Typ (Training, Quali, Rennen)
                    const sessionData = parseSession(msg);
                    state.updateSession(sessionData);
                    // Status-Update für Tray senden, wenn sich Daten geändert haben
                    if (onStatusUpdate && state.trackName !== 'Unknown') {
                        onStatusUpdate({
                            isRecording: true,
                            trackName: state.trackName,
                            sessionType: state.sessionType
                        });
                    }
                    break;
                }
                case 2: { // Rundendaten: Aktuelle Runde, Sektorzeiten, Pit-Status
                    const lapDataArray = parseLapData(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                }
                case 3: { // Event-Daten: Strafen, Unfälle, Safety-Car, Session-Ende
                    const eventData = parseEventData(msg);
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
                    const participantsData = parseParticipants(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                }
                case 6: { // Fahrzeug-Telemetrie: Geschwindigkeit, Gas, Bremse, Temperaturen
                    const telemetryData = parseTelemetry(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
                }
                case 5: { // Car Setups: Flügel-Einstellungen, Differential, Reifendruck
                    const setups = parseCarSetups(msg);
                    setups.forEach((s, i) => state.updateCarSetup(i, s));
                    break;
                }
                case 7: { // Fahrzeug-Status: ERS, Benzin, FIA Flaggen, Reifenmischung
                    const carStatusArray = parseCarStatus(msg);
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
                    const classification = parseFinalClassificationData(msg, header);
                    state.updateFinalClassification(classification);
                    break;
                }
                case 10: { // Fahrzeug-Schäden: Flügel, Unterboden, Motor-Verschleiß
                    const carDamageArray = parseCarDamage(msg);
                    carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                    break;
                }
                case 11: { // Session History: Historische Sektorzeiten aller Runden
                    const sessionHistory = parseSessionHistoryData(msg, header);
                    state.updateSessionHistory(sessionHistory);
                    break;
                }
                case 13: { // Motion Ex: Erweiterte Daten nur für das Spieler-Fahrzeug
                    const motionEx = parseMotionExData(msg);
                    state.updateMotionEx(header.playerCarIndex, motionEx);
                    break;
                }
                case 12: // Tyre Sets (F1 24/23)
                case 20: { // Tyre Sets (F1 25)
                    const tyreData = parseTyreSets(msg);
                    state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
                    break;
                }
            }
        }
        catch (e) {
            const headerInfo = msg.length >= 29 ? `ID ${(msg[24])} (${msg.length} Bytes)` : `Unbekannt (${msg.length} Bytes)`;
            console.error(`❌ Kritischer Fehler beim Verarbeiten von Paket ${headerInfo}: ${e.message}`);
        }
    });
    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP-Server lauscht auf ${address.address}:${address.port}`);
    });
    // Startet das Binden an den konfigurierten Port
    server.bind(config.port);
}
