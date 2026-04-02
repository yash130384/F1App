import { config } from 'dotenv';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;
import { AppConfig } from './types/config';
import * as fs from 'fs';
import * as path from 'path';

// Lade Umgebungsvariablen
config();

/**
 * Globaler Logger für kritische Fehler, um sie auch bei Terminal-Überschreibung zu fangen.
 */
function logGlobalError(title: string, err: any) {
    const logPath = path.join(process.cwd(), 'error.log');
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${title}: ${err.message || err}\n${err.stack || ''}\n`;
    fs.appendFileSync(logPath, msg + '\n' + '='.repeat(50) + '\n');
    console.error(`\n${title}: ${err.message || err}`);
}

async function main() {
    console.log('\n--- F1 25 Telemetry Router ---');

    let appConfig: AppConfig = {
        leagueId: process.env.LEAGUE_ID || 'MyLeague',
        mode: 'Live Telemetry',
        url: process.env.TARGET_URL || 'http://127.0.0.1:3000/api/telemetry',
        port: parseInt(process.env.UDP_PORT || '20777'),
        intervalMs: 5000,
        autostart: true,
        transmissionMode: 'Balanced (5s)'
    };

    if (process.env.NON_INTERACTIVE === 'true') {
        appConfig.transmissionMode = (process.env.TRANSMISSION_MODE as any) || 'Balanced (5s)';
        appConfig.intervalMs = appConfig.transmissionMode === 'Results Only (60s)' ? 60000 : 
                               appConfig.transmissionMode === 'Live (60Hz)' ? 16 : 5000;
        
        const { startUdpListener } = await import('./udpListener');
        startUdpListener(appConfig);
        return;
    }

    while (true) {
        const response = await prompt<any>({
            type: 'select',
            name: 'mode',
            message: 'Hauptmenü:',
            choices: [
                'Live Telemetry',
                'Fast Process Recordings',
                'Playback Recording (.bin)',
                'Playback Recording (Legacy)',
                'Settings',
                'Exit'
            ]
        });

        if (response.mode === 'Exit') process.exit(0);
        appConfig.mode = response.mode;

        if (appConfig.mode === 'Settings') {
            const settings = await prompt<any>([
                { type: 'input', name: 'leagueId', message: 'Liga-ID:', initial: appConfig.leagueId },
                { type: 'input', name: 'url', message: 'Ziel-URL:', initial: appConfig.url },
                { type: 'numeral', name: 'port', message: 'UDP Port:', initial: appConfig.port }
            ]);
            appConfig = { ...appConfig, ...settings };
            continue;
        }

        if (appConfig.mode === 'Live Telemetry') {
            const transRes = await prompt<any>({
                type: 'select',
                name: 'transmissionMode',
                message: 'Übertragungsfrequenz wählen:',
                choices: ['Live (60Hz)', 'Balanced (5s)', 'Results Only (60s)']
            });
            appConfig.transmissionMode = transRes.transmissionMode;
            appConfig.intervalMs = 
                transRes.transmissionMode === 'Live (60Hz)' ? 16 : 
                transRes.transmissionMode === 'Balanced (5s)' ? 5000 : 60000;

            const { startUdpListener } = await import('./udpListener');
            startUdpListener(appConfig);
            return;
        }

        if (appConfig.mode === 'Fast Process Recordings') {
            const { fastProcessRecordings } = await import('./fastProcess');
            await fastProcessRecordings(appConfig);
        }

        if (appConfig.mode === 'Playback Recording (.bin)') {
            const { startBinPlayback } = await import('./playbackBin');
            await startBinPlayback(appConfig);
        }

        if (appConfig.mode === 'Playback Recording (Legacy)') {
            const { startPlayback } = await import('./playback');
            await startPlayback(appConfig);
        }
    }
}

main().catch(err => {
    logGlobalError('Kritischer Fehler im Hauptprozess', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise) => {
    logGlobalError('Unbehandelte Promise-Rejection', reason);
});

process.on('uncaughtException', (err) => {
    logGlobalError('Unbehandelter Ausnahmefehler', err);
    process.exit(1);
});
