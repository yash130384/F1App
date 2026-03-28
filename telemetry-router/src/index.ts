import { config } from 'dotenv';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;
import { AppConfig } from './types/config';

// Lade Umgebungsvariablen aus der .env Datei
config();

/**
 * Haupteinstiegspunkt der Anwendung.
 * Verwaltet das interaktive Menü und startet die gewählten Sub-Module.
 */
async function main() {
    console.log('\n--- F1 25 Telemetry Router ---');

    // Standard-Konfiguration basierend auf Umgebungsvariablen
    let appConfig: AppConfig = {
        leagueId: process.env.LEAGUE_ID || 'MyLeague',
        mode: 'Live Telemetry',
        url: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry',
        port: parseInt(process.env.UDP_PORT || '20777'),
        intervalMs: 5000,
        autostart: true,
        transmissionMode: 'Balanced (5s)'
    };

    // Automatischer Start (nicht interaktiv) für Headless-Umgebungen/Vercel/Docker
    if (process.env.NON_INTERACTIVE === 'true') {
        appConfig.transmissionMode = (process.env.TRANSMISSION_MODE as any) || 'Balanced (5s)';
        appConfig.intervalMs = appConfig.transmissionMode === 'Results Only (60s)' ? 60000 : 
                               appConfig.transmissionMode === 'Live (60Hz)' ? 16 : 5000;
        
        const { startUdpListener } = await import('./udpListener');
        startUdpListener(appConfig);
        return;
    }

    // Interaktives CLI-Menü
    while (true) {
        const response = await prompt<any>({
            type: 'select',
            name: 'mode',
            message: 'Hauptmenü:',
            choices: [
                'Live Telemetry',
                'Fast Process Recordings',
                'Playback Recording (Legacy)',
                'Settings',
                'Exit'
            ]
        });

        if (response.mode === 'Exit') process.exit(0);

        appConfig.mode = response.mode;

        // Einstellungen anpassen
        if (appConfig.mode === 'Settings') {
            const settings = await prompt<any>([
                { type: 'input', name: 'leagueId', message: 'Liga-ID:', initial: appConfig.leagueId },
                { type: 'input', name: 'url', message: 'Ziel-URL:', initial: appConfig.url },
                { type: 'numeral', name: 'port', message: 'UDP Port:', initial: appConfig.port }
            ]);
            appConfig = { ...appConfig, ...settings };
            continue;
        }

        // Live-Telemetrie Start
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

        // Schnelle Nachverarbeitung von lokalen Aufzeichnungen (.bin Dateien)
        if (appConfig.mode === 'Fast Process Recordings') {
            const { fastProcessRecordings } = await import('./fastProcess');
            await fastProcessRecordings(appConfig);
        }

        // Simuliertes Abspielen einer Session zur UI-Entwicklung
        if (appConfig.mode === 'Playback Recording (Legacy)') {
            const { startPlayback } = await import('./playback');
            await startPlayback(appConfig);
        }
    }
}

// Fehlerbehandlung für den globalen Scope
main().catch(err => {
    console.error('Kritischer Fehler beim Starten der Anwendung:', err);
    process.exit(1);
});
