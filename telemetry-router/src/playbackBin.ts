import * as fs from 'fs';
import * as path from 'path';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;
import { parseHeader, PACKET_HEADER_SIZE } from './parsers/header';
import { parseSession } from './parsers/session';
import { parseParticipants } from './parsers/participants';
import { parseLapData } from './parsers/lapData';
import { parseCarTelemetry } from './parsers/telemetry';
import { parseCarStatus } from './parsers/carStatus';
import { parseCarDamage } from './parsers/carDamage';
import { parseSessionHistory } from './parsers/sessionHistory';
import { parseEventData } from './parsers/eventData';
import { parseMotionData } from './parsers/motionData';
import { parseMotionEx } from './parsers/motionEx';
import { parseCarSetups } from './parsers/carSetups';
import { setSessionUID, resetAccumulatedData } from './sender';
import { DirectDbSender } from './directDbSender';
import { AppConfig } from './types/config';
import { SessionState } from './state';
import { ReprocessDashboard } from './reprocessDashboard';

/**
 * Startet das interaktive Playback einer oder mehrerer .bin Dateien (Turbo-Edition).
 */
export async function startBinPlayback(config: AppConfig) {
    const recordingsDir = path.join(process.cwd(), 'recordings');
    
    if (!fs.existsSync(recordingsDir)) {
        console.error('Kein "recordings" Ordner gefunden!');
        return;
    }

    const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.bin'));
    
    if (files.length === 0) {
        console.error('Keine .bin Dateien im "recordings" Ordner gefunden!');
        return;
    }

    const response = await prompt<any>({
        type: 'multiselect',
        name: 'files',
        message: 'Wähle eine oder mehrere Aufzeichnungen zum Einspielen:',
        choices: files
    });

    if (!response.files || response.files.length === 0) {
        console.log('Keine Dateien ausgewählt.');
        return;
    }

    const state = new SessionState();
    const dbSender = new DirectDbSender(config.leagueId!);
    const dashboard = new ReprocessDashboard(response.files, 'TURBO ECO-SIMULATOR (60Hz)');
    
    dashboard.start();

    for (const fileName of response.files) {
        const filePath = path.join(recordingsDir, fileName);
        dashboard.setStatus(fileName, 'processing');
        try {
            await playFile(filePath, config, state, dbSender, dashboard);
            dashboard.setStatus(fileName, 'done');
        } catch (e: any) {
            dashboard.setStatus(fileName, 'error', e.message);
            dashboard.log(`Fehler bei ${fileName}: ${e.message}`, 'error');
            throw e; 
        }
    }
    
    dashboard.log('Alle Sessions erfolgreich eingespielt!', 'success');
}

export async function playFile(filePath: string, config: AppConfig, state: SessionState, dbSender: DirectDbSender, dashboard: ReprocessDashboard) {
    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);
    let offset = 0;
    let packetCount = 0;
    
    resetAccumulatedData();

    while (offset < buffer.length) {
        if (offset + 6 > buffer.length) break;

        const packetSize = buffer.readUInt16LE(offset + 4);
        const packetOffset = offset + 6;

        if (packetOffset + packetSize > buffer.length) break;

        const packet = buffer.subarray(packetOffset, packetOffset + packetSize);
        offset += (6 + packetSize);

        if (packet.length < PACKET_HEADER_SIZE) continue;

        const header = parseHeader(packet);
        setSessionUID(header.sessionUID.toString());

        switch (header.packetId) {
            case 0:
                const motion = parseMotionData(packet);
                motion.forEach((m, i) => state.updateMotion(i, m));
                break;
            case 1:
                state.updateSession(parseSession(packet));
                break;
            case 2:
                const laps = parseLapData(packet);
                laps.forEach((l, i) => state.updateLapData(i, l));
                break;
            case 3:
                const event = parseEventData(packet);
                state.handleEvent(event);
                if (event.eventStringCode === 'SEND') {
                    const payload = state.buildPayloadAndClear();
                    if (payload.participants.length > 0) await dbSender.processPayload(payload);
                }
                break;
            case 4:
                const parts = parseParticipants(packet);
                parts.participants.forEach((p, i) => state.updateParticipant(i, p));
                break;
            case 5:
                const setups = parseCarSetups(packet);
                setups.forEach((s, i) => state.updateCarSetup(i, s));
                break;
            case 6:
                const tele = parseCarTelemetry(packet);
                tele.forEach((t, i) => state.updateTelemetry(i, t));
                break;
            case 7:
                const status = parseCarStatus(packet);
                status.forEach((s, i) => state.updateCarStatus(i, s));
                break;
            case 10:
                const damage = parseCarDamage(packet);
                damage.forEach((d, i) => state.updateCarDamage(i, d));
                break;
            case 11:
                state.updateSessionHistory(parseSessionHistory(packet));
                break;
            case 12:
                state.updateMotionEx(header.playerCarIndex, parseMotionEx(packet));
                break;
        }

        packetCount++;
        
        if (packetCount % 5000 === 0) {
            const progress = (offset / buffer.length) * 100;
            dashboard.updateProgress(fileName, progress);
            const payload = state.buildPayloadAndClear();
            if (payload.participants.length > 0) {
                await dbSender.processPayload(payload);
            }
        }
    }

    dashboard.updateProgress(fileName, 100);
    const finalPayload = state.buildPayloadAndClear();
    finalPayload.isSessionEnded = true;
    await dbSender.processPayload(finalPayload);
}
