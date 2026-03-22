import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './index';
import { SessionState } from './state';

export function startSender(config: AppConfig, state: SessionState) {
    if (config.mode === 'Local Recording') {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        const filename = path.join(logsDir, `recording_${Date.now()}.json`);
        console.log(`Recording local data to ${filename}`);

        fs.writeFileSync(filename, '[\n');

        let isFirst = true;

        setInterval(() => {
            const payload = state.buildPayloadAndClear();
            if (payload.participants.length > 0 && payload.sessionType !== 'Unknown') {
                const line = (isFirst ? '' : ',\n') + JSON.stringify(payload);
                fs.appendFileSync(filename, line);
                isFirst = false;
            }
        }, config.intervalMs);

        process.on('SIGINT', () => {
            console.log('Shutting down and saving recording...');
            fs.appendFileSync(filename, '\n]');
            process.exit();
        });

        return;
    }

    console.log(`Starting Live Routing to ${config.url} with ${config.transmissionMode} (Interval: ${config.intervalMs}ms)`);
    let skipCount = 0;

    setInterval(async () => {
        const payload = state.buildPayloadAndClear();

        // Send if there are human participants (regardless of session type)
        const hasHumans = payload.participants.some(p => p.isHuman);

        if (hasHumans) {
            skipCount = 0; // reset
            const body = {
                leagueId: config.leagueId,
                packet: payload
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const res = await fetch(config.url!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal as any
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    console.error(`Failed to send chunk, HTTP status: ${res.status}`);
                }
            } catch (e: any) {
                clearTimeout(timeoutId);
                console.error(`Error sending telemetry: ${e.message}`);
            }
        } else {
            // Silently skip if no humans or wrong session type
            // (Dashboard handles status display)
        }
    }, config.intervalMs);
}
