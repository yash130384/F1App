"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSender = startSender;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function startSender(config, state) {
    if (config.mode === 'Local Recording') {
        const logsDir = path_1.default.join(process.cwd(), 'logs');
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir);
        }
        const filename = path_1.default.join(logsDir, `recording_${Date.now()}.json`);
        console.log(`Recording local data to ${filename}`);
        fs_1.default.writeFileSync(filename, '[\n');
        let isFirst = true;
        setInterval(() => {
            const payload = state.buildPayloadAndClear();
            if (payload.participants.length > 0 && payload.sessionType !== 'Unknown') {
                const line = (isFirst ? '' : ',\n') + JSON.stringify(payload);
                fs_1.default.appendFileSync(filename, line);
                isFirst = false;
            }
        }, config.intervalMs);
        process.on('SIGINT', () => {
            console.log('Shutting down and saving recording...');
            fs_1.default.appendFileSync(filename, '\n]');
            process.exit();
        });
        return;
    }
    console.log(`Starting Live Routing to ${config.url} every ${config.intervalMs}ms`);
    let skipCount = 0;
    setInterval(async () => {
        const payload = state.buildPayloadAndClear();
        // Only send if it's a Race session (Type 15) and there are human participants
        const hasHumans = payload.participants.some(p => p.isHuman);
        const isSession15 = payload.sessionData?.sessionTypeRaw === 15;
        if (isSession15 && hasHumans) {
            skipCount = 0; // reset
            const body = {
                leagueId: config.leagueId,
                packet: payload
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
                const res = await (0, node_fetch_1.default)(config.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!res.ok) {
                    console.error(`Failed to send chunk, HTTP status: ${res.status}`);
                }
                else {
                    console.log(`Successfully sent ${payload.participants.length} participants telemetry`);
                }
            }
            catch (e) {
                clearTimeout(timeoutId);
                console.error(`Error sending telemetry: ${e.message}`);
            }
        }
        else {
            skipCount++;
            if (skipCount % 5 === 0) {
                console.log(`[!] Skipping send: sessionType=${payload.sessionType}, participants=${payload.participants.length}`);
            }
        }
    }, config.intervalMs);
}
