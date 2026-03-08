import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { AppConfig } from './index';
// If using commonjs for enquirer, prompt works out of the box.
import { prompt } from 'enquirer';

export async function startPlayback(config: AppConfig) {
    console.log('\n--- Playback Mode ---');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        console.error('No logs directory found.');
        return;
    }

    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.error('No recordings found in ./logs');
        return;
    }

    const response = await prompt<any>({
        type: 'select',
        name: 'file',
        message: 'Select a recording to playback:',
        choices: files
    });

    const fileData = fs.readFileSync(path.join(logsDir, response.file), 'utf-8');

    let jsonData;
    try {
        let text = fileData.trim();
        // Handle abruptly terminated JSON arrays
        if (!text.endsWith(']')) text += '\n]';
        jsonData = JSON.parse(text);
    } catch (e) {
        console.error('Error parsing recording file. Make sure it is valid JSON.');
        return;
    }

    console.log(`Loaded ${jsonData.length} frames. Starting playback to ${config.url} at ${config.intervalMs}ms interval...`);

    let index = 0;
    const timer = setInterval(async () => {
        if (index >= jsonData.length) {
            console.log('Playback complete.');
            clearInterval(timer);
            return;
        }

        const payload = jsonData[index];
        index++;

        const body = {
            leagueId: config.leagueId,
            packet: payload
        };

        try {
            const res = await fetch(config.url!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                console.error(`Failed to send chunk ${index}, status: ${res.status}`);
            } else {
                console.log(`Sent chunk ${index} / ${jsonData.length}`);
            }
        } catch (e: any) {
            console.error(`Error sending telemetry chunk ${index}: ${e.message}`);
        }
    }, config.intervalMs);
}
