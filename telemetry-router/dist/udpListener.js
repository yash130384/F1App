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
const state_1 = require("./state");
const sender_1 = require("./sender");
function startUdpListener(config) {
    if (!config.port) {
        console.error('No UDP port specified for listener.');
        return;
    }
    const server = dgram_1.default.createSocket('udp4');
    const state = new state_1.SessionState();
    // Start the interval aggregation loop
    (0, sender_1.startSender)(config, state);
    server.on('error', (err) => {
        console.error(`UDP Server error:\n${err.stack}`);
        server.close();
    });
    let packetCount = 0;
    server.on('message', (msg, rinfo) => {
        packetCount++;
        if (packetCount % 600 === 0) {
            console.log(`Received 600 packets... last from ${rinfo.address}:${rinfo.port} (${msg.length} bytes)`);
        }
        if (msg.length < 29)
            return;
        try {
            const header = (0, header_1.parseHeader)(msg);
            // Route packet based on packetId
            switch (header.packetId) {
                case 1: // Session Data
                    const sessionData = (0, session_1.parseSession)(msg);
                    state.sessionType = sessionData.sessionTypeMapped;
                    state.trackId = sessionData.trackId;
                    state.isActive = true;
                    break;
                case 2: // Lap Data
                    const lapDataArray = (0, lapData_1.parseLapData)(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                case 4: // Participants Data
                    const participantsData = (0, participants_1.parseParticipants)(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                case 6: // Car Telemetry
                    const telemetryData = (0, telemetry_1.parseTelemetry)(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
            }
        }
        catch (e) {
            // console.error('Error parsing packet: ', e);
        }
    });
    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP Server listening on ${address.address}:${address.port}`);
    });
    server.bind(config.port);
}
