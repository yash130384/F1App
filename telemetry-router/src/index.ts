import { config } from 'dotenv';
import { prompt } from 'enquirer';

config(); // Load .env if exists

export interface AppConfig {
    leagueId: string;
    mode: 'Live Telemetry' | 'Fast Process Recordings' | 'Playback Recording (Legacy)' | 'Settings' | 'Local Recording';
    transmissionMode?: 'Live (60Hz)' | 'Balanced (5s)' | 'Results Only (60s)';
    url?: string;
    port?: number;
    intervalMs: number;
}

async function main() {
    console.log('\n--- F1 25 Telemetry Router ---');

    let appConfig: AppConfig = {
        leagueId: process.env.LEAGUE_ID || 'MyLeague',
        mode: 'Live Telemetry',
        url: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry',
        port: parseInt(process.env.UDP_PORT || '20888'),
        intervalMs: 5000
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
            message: 'Main Menu:',
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

        if (appConfig.mode === 'Settings') {
            const settings = await prompt<any>([
                { type: 'input', name: 'leagueId', message: 'League ID:', initial: appConfig.leagueId },
                { type: 'input', name: 'url', message: 'Target URL:', initial: appConfig.url },
                { type: 'numeral', name: 'port', message: 'UDP Port:', initial: appConfig.port }
            ]);
            appConfig = { ...appConfig, ...settings };
            continue;
        }

        if (appConfig.mode === 'Live Telemetry') {
            const transRes = await prompt<any>({
                type: 'select',
                name: 'transmissionMode',
                message: 'Select Transmission Mode:',
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

        if (appConfig.mode === 'Playback Recording (Legacy)') {
            const { startPlayback } = await import('./playback');
            await startPlayback(appConfig);
        }
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
