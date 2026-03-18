"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startUdpListener = startUdpListener;
const dgram_1 = __importDefault(require("dgram"));
const header_1 = require("./parsers/header");
const session_1 = require("./parsers/session");
const participants_1 = require("./parsers/participants");
const lapData_1 = require("./parsers/lapData");
const telemetry_1 = require("./parsers/telemetry");
const carStatus_1 = require("./parsers/carStatus");
const eventData_1 = require("./parsers/eventData");
const carDamage_1 = require("./parsers/carDamage");
const state_1 = require("./state");
const sender_1 = require("./sender");
function startUdpListener(config) {
    if (!config.port) {
        console.error('Kein UDP-Port angegeben.');
        return;
    }
    const server = dgram_1.default.createSocket('udp4');
    const state = new state_1.SessionState();
    // Aggregationsschleife starten
    (0, sender_1.startSender)(config, state);
    server.on('error', (err) => {
        console.error(`UDP-Serverfehler:\n${err.stack}`);
        server.close();
    });
    let packetCount = 0;
    server.on('message', (msg, rinfo) => {
        packetCount++;
        if (packetCount % 600 === 0) {
            console.log(`600 Pakete empfangen... letztes von ${rinfo.address}:${rinfo.port} (${msg.length} Bytes)`);
        }
        if (msg.length < 29)
            return;
        try {
            const header = (0, header_1.parseHeader)(msg);
            switch (header.packetId) {
                case 1: { // Session-Daten
                    const sessionData = (0, session_1.parseSession)(msg);
                    state.sessionType = sessionData.sessionTypeMapped;
                    state.trackId = sessionData.trackId;
                    state.trackLength = sessionData.trackLength;
                    state.sessionData = sessionData;
                    state.isActive = true;
                    break;
                }
                case 2: { // Rundendaten
                    const lapDataArray = (0, lapData_1.parseLapData)(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                }
                case 3: { // Event-Daten
                    const eventData = (0, eventData_1.parseEventData)(msg);
                    if (eventData.eventStringCode === 'SEND') {
                        console.log('🏁 SESSION BEENDET (SEND). Wird übermittelt...');
                        state.handleSessionEnd();
                    }
                    else if (eventData.eventStringCode === 'SCAR') {
                        // Safety Car Event (safetyCarType und eventType aus dem Paket)
                        state.addSafetyCarEvent(eventData.safetyCarType ?? 0, eventData.eventType ?? 0);
                    }
                    break;
                }
                case 4: { // Teilnehmer-Daten
                    const participantsData = (0, participants_1.parseParticipants)(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                }
                case 6: { // Fahrzeug-Telemetrie
                    const telemetryData = (0, telemetry_1.parseTelemetry)(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
                }
                case 7: { // Fahrzeug-Status
                    const carStatusArray = (0, carStatus_1.parseCarStatus)(msg);
                    carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                    break;
                }
                case 10: { // Fahrzeug-Schäden (CarDamage)
                    const carDamageArray = (0, carDamage_1.parseCarDamage)(msg);
                    carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                    break;
                }
                case 15: { // Rundenpositionen (LapPositions) – alle Fahrzeuge pro Runde
                    state.updateLapPositions(msg);
                    break;
                }
            }
        }
        catch (e) {
            console.error('Fehler beim Parsen des Pakets:', e.message);
        }
    });
    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP-Server lauscht auf ${address.address}:${address.port}`);
    });
    server.bind(config.port);
}
