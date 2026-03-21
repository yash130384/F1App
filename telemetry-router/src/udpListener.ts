import dgram from 'dgram';
import { AppConfig } from './index';
import { parseHeader } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseEventData } from './parsers/eventData';
import { parseCarDamage } from './parsers/carDamage';
import { parseMotionData } from './parsers/motionData';
import { SessionState } from './state';
import { startSender } from './sender';

export function startUdpListener(config: AppConfig) {
    if (!config.port) {
        console.error('Kein UDP-Port angegeben.');
        return;
    }

    const server = dgram.createSocket('udp4');
    const state = new SessionState();

    // Aggregationsschleife starten
    startSender(config, state);

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

        if (msg.length < 29) return;

        try {
            const header = parseHeader(msg);

            switch (header.packetId) {
                case 0: { // Motion-Daten (G-Kräfte, Weltpositionen)
                    const motionArray = parseMotionData(msg);
                    motionArray.forEach((m, i) => state.updateMotion(i, m));
                    break;
                }
                case 1: { // Session-Daten
                    const sessionData = parseSession(msg);
                    state.sessionType = sessionData.sessionTypeMapped;
                    state.trackId = sessionData.trackId;
                    state.trackLength = sessionData.trackLength;
                    state.sessionData = sessionData;
                    state.isActive = true;
                    break;
                }
                case 2: { // Rundendaten
                    const lapDataArray = parseLapData(msg);
                    lapDataArray.forEach((lap, i) => state.updateLapData(i, lap));
                    break;
                }
                case 3: { // Event-Daten
                    const eventData = parseEventData(msg);
                    if (eventData.eventStringCode === 'SEND') {
                        console.log('🏁 SESSION BEENDET (SEND). Wird übermittelt...');
                        state.handleSessionEnd();
                    } else if (eventData.eventStringCode === 'SCAR') {
                        // Safety Car Event (safetyCarType und eventType aus dem Paket)
                        state.addSafetyCarEvent(
                            eventData.safetyCarType ?? 0,
                            eventData.eventType ?? 0
                        );
                    }
                    break;
                }
                case 4: { // Teilnehmer-Daten
                    const participantsData = parseParticipants(msg);
                    participantsData.forEach((p, i) => state.updateParticipant(i, p));
                    break;
                }
                case 6: { // Fahrzeug-Telemetrie
                    const telemetryData = parseTelemetry(msg);
                    telemetryData.forEach((t, i) => state.updateTelemetry(i, t));
                    break;
                }
                case 7: { // Fahrzeug-Status
                    const carStatusArray = parseCarStatus(msg);
                    carStatusArray.forEach((cs, i) => state.updateCarStatus(i, cs));
                    break;
                }
                case 10: { // Fahrzeug-Schäden (CarDamage)
                    const carDamageArray = parseCarDamage(msg);
                    carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                    break;
                }
                case 15: { // Rundenpositionen (LapPositions) – alle Fahrzeuge pro Runde
                    state.updateLapPositions(msg);
                    break;
                }
            }
        } catch (e: any) {
            console.error('Fehler beim Parsen des Pakets:', e.message);
        }
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`📡 UDP-Server lauscht auf ${address.address}:${address.port}`);
    });

    server.bind(config.port);
}
