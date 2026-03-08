"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPlayback = startPlayback;
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
// If using commonjs for enquirer, prompt works out of the box.
const enquirer_1 = require("enquirer");
async function startPlayback(config) {
    console.log('\n--- Playback Mode ---');
    const logsDir = path_1.default.join(process.cwd(), 'logs');
    if (!fs_1.default.existsSync(logsDir)) {
        console.error('No logs directory found.');
        return;
    }
    const files = fs_1.default.readdirSync(logsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.error('No recordings found in ./logs');
        return;
    }
    const response = await (0, enquirer_1.prompt)({
        type: 'select',
        name: 'file',
        message: 'Select a recording to playback:',
        choices: files
    });
    const fileData = fs_1.default.readFileSync(path_1.default.join(logsDir, response.file), 'utf-8');
    let jsonData;
    try {
        let text = fileData.trim();
        // Handle abruptly terminated JSON arrays
        if (!text.endsWith(']'))
            text += '\n]';
        jsonData = JSON.parse(text);
    }
    catch (e) {
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
            const res = await (0, node_fetch_1.default)(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                console.error(`Failed to send chunk ${index}, status: ${res.status}`);
            }
            else {
                console.log(`Sent chunk ${index} / ${jsonData.length}`);
            }
        }
        catch (e) {
            console.error(`Error sending telemetry chunk ${index}: ${e.message}`);
        }
    }, config.intervalMs);
}
