"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const enquirer_1 = require("enquirer");
const udpListener_1 = require("./udpListener");
const playback_1 = require("./playback");
(0, dotenv_1.config)(); // Load .env if exists
async function main() {
    console.log('--- F1 2025 Telemetry Router ---');
    let appConfig = {};
    try {
        const responses = await (0, enquirer_1.prompt)([
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
            const urlRes = await (0, enquirer_1.prompt)({
                type: 'input',
                name: 'url',
                message: 'Enter destination Web App URL (e.g. http://localhost:3000/api/telemetry):',
                initial: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry'
            });
            appConfig.url = urlRes.url;
        }
        if (appConfig.mode === 'Live Routing' || appConfig.mode === 'Local Recording') {
            const portRes = await (0, enquirer_1.prompt)({
                type: 'numeral',
                name: 'port',
                message: 'Enter UDP Port to listen on:',
                initial: parseInt(process.env.UDP_PORT || '20777')
            });
            appConfig.port = portRes.port;
        }
        const intervalRes = await (0, enquirer_1.prompt)({
            type: 'numeral',
            name: 'interval',
            message: 'Enter dispatch interval in (ms):',
            initial: parseInt(process.env.DISPATCH_INTERVAL || '1000')
        });
        appConfig.intervalMs = intervalRes.interval;
    }
    catch (e) {
        console.log('Setup cancelled.');
        process.exit(0);
    }
    console.log('\nStarting Router with configuration:');
    console.log(appConfig);
    if (appConfig.mode === 'Live Routing' || appConfig.mode === 'Local Recording') {
        (0, udpListener_1.startUdpListener)(appConfig);
    }
    else {
        (0, playback_1.startPlayback)(appConfig);
    }
}
main();
