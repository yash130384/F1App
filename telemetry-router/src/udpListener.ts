import dgram from 'dgram';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './types/config';
import { parseHeader, PACKET_HEADER_SIZE } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseCarTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseMotionData } from './parsers/motionData';
import { parseSessionHistory } from './parsers/sessionHistory';
import { parseFinalClassification } from './parsers/finalClassification';
import { parseMotionEx } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import { parseCarSetups } from './parsers/carSetups';
import { SessionState } from './state';
import { startSender, triggerImmediateSend, setSessionUID } from './sender';
import { renderDashboard } from './dashboard';

export interface StatusUpdate {
    isRecording: boolean;
    trackName?: string;
    sessionType?: string;
}

export function startUdpListener(config: AppConfig, onStatusUpdate?: (status: StatusUpdate) => void) {
    if (!config.port) {
        console.error('Kritischer Fehler: Kein UDP-Port angegeben.');
        return;
    }

    const server = dgram.createSocket('udp4');
    const state = new SessionState();
    const recordingsDir = path.join(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

    let recordingStream: fs.WriteStream | null = null;
    let currentSessionUID: bigint = BigInt(0);

    startSender(config, state);

    server.on('message', async (msg) => {
        if (msg.length < PACKET_HEADER_SIZE) return;

        try {
            const header = parseHeader(msg);

            // Neue Session erkennen
            if (header.sessionUID !== currentSessionUID) {
                if (recordingStream) {
                    recordingStream.end();
                    recordingStream = null;
                }
                
                if (currentSessionUID !== BigInt(0)) {
                    await triggerImmediateSend();
                }
                
                currentSessionUID = header.sessionUID;
                setSessionUID(currentSessionUID.toString());
                state.reset();
                
                const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = path.join(recordingsDir, `session_${currentSessionUID}_${timeStr}.bin`);
                recordingStream = fs.createWriteStream(filename, { flags: 'a' });
                console.log(`\n🎥 Neue Session: ${currentSessionUID}`);
            }

            // In .bin Recording schreiben (6-byte header format)
            if (recordingStream) {
                const fHeader = Buffer.alloc(6);
                fHeader.writeUInt32LE(0, 0); 
                fHeader.writeUInt16LE(msg.length, 4); 
                recordingStream.write(fHeader);
                recordingStream.write(msg);
            }

            // Pakete verarbeiten
            switch (header.packetId) {
                case 0: // Motion
                    const motion = parseMotionData(msg);
                    motion.forEach((m, i) => state.updateMotion(i, m));
                    break;
                case 1: // Session
                    const session = parseSession(msg);
                    state.updateSession(session);
                    break;
                case 2: // Lap Data
                    const laps = parseLapData(msg);
                    laps.forEach((l, i) => state.updateLapData(i, l));
                    break;
                case 3: // Event
                    const event = parseEventData(msg);
                    state.handleEvent(event);
                    if (event.eventStringCode === 'SEND') {
                        await triggerImmediateSend();
                    }
                    break;
                case 4: // Participants
                    const parts = parseParticipants(msg);
                    parts.participants.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                case 6: // Telemetry
                    const tele = parseCarTelemetry(msg);
                    tele.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
                case 7: // Status
                    const status = parseCarStatus(msg);
                    status.forEach((s, i) => state.updateCarStatus(i, s));
                    break;
                case 10: // Damage
                    const damage = parseCarDamage(msg);
                    damage.forEach((d, i) => state.updateCarDamage(i, d));
                    break;
                case 11: // History
                    const history = parseSessionHistory(msg);
                    state.updateSessionHistory(history);
                    break;
                case 5: // Setups
                    const setups = parseCarSetups(msg);
                    setups.forEach((s, i) => state.updateCarSetup(i, s));
                    break;
                case 12: // MotionEx
                    const mex = parseMotionEx(msg);
                    state.updateMotionEx(header.playerCarIndex, mex);
                    break;
                case 13: // Tyre Sets
                    const tyres = parseTyreSets(msg);
                    state.updateTyreSets(tyres.carIdx, tyres.tyreSetData);
                    break;
                case 8: // Final Classification
                    const fc = parseFinalClassification(msg);
                    state.updateFinalClassification(fc);
                    await triggerImmediateSend();
                    break;
            }

            if (state.packetCount % 500 === 0) {
                renderDashboard(state.getDashboardState());
            }

        } catch (e) {
            // Ignorieren
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`👂 UDP Listener aktiv auf Port ${address.port}`);
    });

    server.bind(config.port);
}
