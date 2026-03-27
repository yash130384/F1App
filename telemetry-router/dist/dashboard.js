"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDashboard = renderDashboard;
const readline_1 = __importDefault(require("readline"));
/**
 * Rendert eine kompakte Übersicht des aktuellen Status direkt in das Terminal.
 * Löscht bei jedem Aufruf die Konsole für einen sauberen "Live-Dashboard" Effekt.
 *
 * @param config Die globale Anwendungskonfiguration.
 * @param state Der aktuelle Zustand aus dem SessionState.
 */
function renderDashboard(config, state) {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    // Konsole leeren (ANSI Escape Code)
    process.stdout.write('\x1Bc');
    console.log('=====================================================');
    console.log('   🏎  F1 2025 TELEMETRY ROUTER - DASHBOARD         ');
    console.log('=====================================================');
    console.log(` Modus:       ${config.mode}`);
    console.log(` Liga:        ${config.leagueId}`);
    console.log(` Ziel-URL:    ${config.url || 'N/A'}`);
    console.log(` UDP-Port:    ${config.port || 'N/A'}`);
    console.log(` Intervall:   ${config.transmissionMode || 'N/A'} (${config.intervalMs}ms)`);
    console.log('-----------------------------------------------------');
    console.log('   AKTUELLER SESSION-STATUS');
    console.log('-----------------------------------------------------');
    console.log(` Strecke:     ${state.trackName || 'Warte auf Daten...'}`);
    console.log(` Typ:         ${state.sessionType || 'Unbekannt'}`);
    console.log(` Status:      ${state.isActive ? '🟢 AKTIV' : '🔴 INAKTIV'}`);
    console.log(` Pakete:      ${state.packetCount}`);
    console.log(` Letzte Daten: ${state.lastPacketTime > 0 ? new Date(state.lastPacketTime).toLocaleTimeString() : 'N/A'}`);
    console.log('=====================================================');
    console.log(' Drücken Sie Strg+C zum Beenden.');
    rl.close();
}
