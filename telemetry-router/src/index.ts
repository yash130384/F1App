import { config } from 'dotenv';
import { prompt } from 'enquirer';
import { startUdpListener } from './udpListener';
import { startPlayback } from './playback';

config(); // Load .env if exists

export interface AppConfig {
    leagueId: string;
    mode: 'Live Routing' | 'Local Recording' | 'Playback';
    transmissionMode?: 'Live (60Hz)' | 'Results Only (60s)';
    url?: string;
    port?: number;
    intervalMs: number;
}

async function main() {
    console.log('--- F1 2025 Telemetry Router ---');

    let appConfig: Partial<AppConfig> = {};

    if (process.env.NON_INTERACTIVE === 'true') {
        appConfig.leagueId = process.env.LEAGUE_ID || 'MyLeague';
        appConfig.mode = (process.env.MODE as any) || 'Live Routing';
        appConfig.url = process.env.TARGET_URL || 'http://localhost:3000/api/telemetry';
        appConfig.transmissionMode = (process.env.TRANSMISSION_MODE as any) || 'Balanced (5s)';
        appConfig.intervalMs = appConfig.transmissionMode === 'Results Only (60s)' ? 60000 : 
                               appConfig.transmissionMode === 'Live (60Hz)' ? 16 : 5000;
        appConfig.port = parseInt(process.env.UDP_PORT || '20888');
    } else {
        try {
            const responses = await prompt<any>([
                {
                    type: 'input',
                    name: 'leagueId',
                    message: 'Enter your League ID/Name:',
                    initial: process.env.LEAGUE_ID || 'MyLeague'
                },
                {
                    type: 'select',
                    name: 'mode',
                    message: 'Select Operation Mode:',
                    choices: ['Live Routing', 'Local Recording', 'Playback']
                }
            ]);

            appConfig.leagueId = responses.leagueId;
            appConfig.mode = responses.mode;

            if (appConfig.mode === 'Live Routing' || appConfig.mode === 'Playback') {
                const urlRes = await prompt<any>({
                    type: 'input',
                    name: 'url',
                    message: 'Enter destination Web App URL:',
                    initial: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry'
                });
                appConfig.url = urlRes.url;

                if (appConfig.mode === 'Live Routing') {
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
                }
            }

            if (appConfig.mode === 'Live Routing' || appConfig.mode === 'Local Recording') {
                const portRes = await prompt<any>({
                    type: 'numeral',
                    name: 'port',
                    message: 'Enter UDP Port to listen on:',
                    initial: parseInt(process.env.UDP_PORT || '20888')
                });
                appConfig.port = portRes.port;
            }

            if (appConfig.mode !== 'Live Routing') {
                const intervalRes = await prompt<any>({
                    type: 'numeral',
                    name: 'interval',
                    message: 'Enter dispatch interval in (ms):',
                    initial: parseInt(process.env.DISPATCH_INTERVAL || '1000')
                });
                appConfig.intervalMs = intervalRes.interval;
            }

        } catch (e) {
            console.log('Setup cancelled.');
            process.exit(0);
        }
    }

    console.log('\nStarting Router with configuration:');
    console.log(appConfig);

    if (appConfig.mode === 'Live Routing' || appConfig.mode === 'Local Recording') {
        startUdpListener(appConfig as AppConfig);
    } else {
        startPlayback(appConfig as AppConfig);
    }
}

main();
