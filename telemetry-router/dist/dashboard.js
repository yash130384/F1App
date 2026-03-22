"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDashboard = renderDashboard;
const readline_1 = __importDefault(require("readline"));
function renderDashboard(config, state) {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    // Clear console
    process.stdout.write('\x1Bc');
    console.log('=====================================================');
    console.log('   🏎  F1 2025 TELEMETRY ROUTER - DASHBOARD         ');
    console.log('=====================================================');
    console.log(` Mode:        ${config.mode}`);
    console.log(` League:      ${config.leagueId}`);
    console.log(` Target URL:  ${config.url || 'N/A'}`);
    console.log(` Listen Port: ${config.port || 'N/A'}`);
    console.log(` Mode:        ${config.transmissionMode || 'N/A'} (${config.intervalMs}ms)`);
    console.log('-----------------------------------------------------');
    console.log('   CURRENT SESSION STATUS');
    console.log('-----------------------------------------------------');
    console.log(` Track:       ${state.trackName || 'Waiting...'}`);
    console.log(` Type:        ${state.sessionType || 'Unknown'}`);
    console.log(` Status:      ${state.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}`);
    console.log(` Packets:     ${state.packetCount}`);
    console.log(` Last Data:   ${state.lastPacketTime > 0 ? new Date(state.lastPacketTime).toLocaleTimeString() : 'N/A'}`);
    console.log('=====================================================');
    console.log(' Press Ctrl+C to stop the router.');
    rl.close();
}
