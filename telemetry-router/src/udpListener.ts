import dgram from 'dgram';
import { AppConfig } from './index';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseTelemetry } from './parsers/telemetry';
import { SessionState } from './state';
import { startSender } from './sender';

export function startUdpListener(config: AppConfig) {
    if (!config.port) {
        console.error('No UDP port specified for listener.');
        return;
    }

    const server = dgram.createSocket('udp4');
    const state = new SessionState();

    // Start the interval aggregation loop
    startSender(config, state);

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

        if (msg.length < 29) return;

        try {
            const header = parseHeader(msg);

            // Route packet based on packetId
            switch (header.packetId) {
                case 1: // Session Data
                    const sessionData = parseSession(msg);
                    state.sessionType = sessionData.sessionTypeMapped;
                    state.trackId = sessionData.trackId;
                    state.isActive = true;
                    break;
                case 2: // Lap Data
                    const lapDataArray = parseLapData(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                case 4: // Participants Data
                    const participantsData = parseParticipants(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                case 6: // Car Telemetry
                    const telemetryData = parseTelemetry(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
            }
        } catch (e) {
            // console.error('Error parsing packet: ', e);
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP Server listening on ${address.address}:${address.port}`);
    });

    server.bind(config.port);
}

