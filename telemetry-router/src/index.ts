import { config } from 'dotenv';
import { prompt } from 'enquirer';
import { startUdpListener } from './udpListener';
import { startPlayback } from './playback';

config(); // Load .env if exists

export interface AppConfig {
    leagueId: string;
    mode: 'Live Routing' | 'Local Recording' | 'Playback';
    url?: string;
    port?: number;
    intervalMs: number;
}

async function main() {
    console.log('--- F1 2025 Telemetry Router ---');

    let appConfig: Partial<AppConfig> = {};

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
                initial: process.env.TARGET_URL || 'https://f1-app-lknx.vercel.app/api/telemetry'
            });
            appConfig.url = urlRes.url;
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

        const intervalRes = await prompt<any>({
            type: 'numeral',
            name: 'interval',
            message: 'Enter dispatch interval in (ms):',
            initial: parseInt(process.env.DISPATCH_INTERVAL || '1000')
        });
        appConfig.intervalMs = intervalRes.interval;

    } catch (e) {
        console.log('Setup cancelled.');
        process.exit(0);
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
