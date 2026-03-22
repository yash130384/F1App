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
import { parseMotionExData } from './parsers/motionEx';
import { parseTyreSets } from './parsers/tyreSets';
import { SessionState } from './state';
import { startSender } from './sender';
import { renderDashboard } from './dashboard';

export function startUdpListener(config: AppConfig) {
    if (!config.port) {
        console.error('Kein UDP-Port angegeben.');
        return;
    }

    const server = dgram.createSocket('udp4');
    const state = new SessionState();

    // Aggregationsschleife starten
    startSender(config, state);

    // Dashboard alle 500ms aktualisieren
    setInterval(() => {
        renderDashboard(config, state.getDashboardState());
    }, 500);

    server.on('error', (err) => {
        console.error(`UDP-Serverfehler:\n${err.stack}`);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
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
                    state.updateSession(sessionData);
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
                        state.addSafetyCarEvent(
                            eventData.safetyCarType ?? 0,
                            eventData.eventType ?? 0
                        );
                    } else {
                        state.handleEvent(eventData);
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
                    carStatusArray.forEach((cs, i) => {
                        state.updateCarStatus(i, cs);
                        // Global flag tracken (vom Spieler oder erstem Auto)
                        if (i === header.playerCarIndex || (i === 0 && !state.trackFlags)) {
                            state.trackFlags = cs.vehicleFIAFlags;
                        }
                    });
                    break;
                }
                case 10: { // Fahrzeug-Schäden (CarDamage)
                    const carDamageArray = parseCarDamage(msg);
                    carDamageArray.forEach((cd, i) => state.updateCarDamage(i, cd));
                    break;
                }
                case 11: { // Session History (Motion Ex - Player Only)
                    const motionEx = parseMotionExData(msg);
                    state.updateMotionEx(header.playerCarIndex, motionEx);
                    break;
                }
                case 15: { // Rundenpositionen (LapPositions) – alle Fahrzeuge pro Runde
                    state.updateLapPositions(msg);
                    break;
                }
                case 20: { // Reifensätze (TyreSets)
                    const tyreData = parseTyreSets(msg);
                    state.updateTyreSets(tyreData.carIdx, tyreData.tyreSetData);
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
