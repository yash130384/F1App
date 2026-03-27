"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const enquirer_1 = require("enquirer");
// Lade Umgebungsvariablen aus der .env Datei
(0, dotenv_1.config)();
/**
 * Haupteinstiegspunkt der Anwendung.
 * Verwaltet das interaktive Menü und startet die gewählten Sub-Module.
 */
async function main() {
    console.log('\n--- F1 25 Telemetry Router ---');
    // Standard-Konfiguration basierend auf Umgebungsvariablen
    let appConfig = {
        leagueId: process.env.LEAGUE_ID || 'MyLeague',
        mode: 'Live Telemetry',
        url: process.env.TARGET_URL || 'http://localhost:3000/api/telemetry',
        port: parseInt(process.env.UDP_PORT || '20777'),
        intervalMs: 5000
    };
    // Automatischer Start (nicht interaktiv) für Headless-Umgebungen/Vercel/Docker
    if (process.env.NON_INTERACTIVE === 'true') {
        appConfig.transmissionMode = process.env.TRANSMISSION_MODE || 'Balanced (5s)';
        appConfig.intervalMs = appConfig.transmissionMode === 'Results Only (60s)' ? 60000 :
            appConfig.transmissionMode === 'Live (60Hz)' ? 16 : 5000;
        const { startUdpListener } = await Promise.resolve().then(() => __importStar(require('./udpListener')));
        startUdpListener(appConfig);
        return;
    }
    // Interaktives CLI-Menü
    while (true) {
        const response = await (0, enquirer_1.prompt)({
            type: 'select',
            name: 'mode',
            message: 'Hauptmenü:',
            choices: [
                'Live Telemetry',
                'Fast Process Recordings',
                'Playback Recording (Legacy)',
                'Settings',
                'Exit'
            ]
        });
        if (response.mode === 'Exit')
            process.exit(0);
        appConfig.mode = response.mode;
        // Einstellungen anpassen
        if (appConfig.mode === 'Settings') {
            const settings = await (0, enquirer_1.prompt)([
                { type: 'input', name: 'leagueId', message: 'Liga-ID:', initial: appConfig.leagueId },
                { type: 'input', name: 'url', message: 'Ziel-URL:', initial: appConfig.url },
                { type: 'numeral', name: 'port', message: 'UDP Port:', initial: appConfig.port }
            ]);
            appConfig = { ...appConfig, ...settings };
            continue;
        }
        // Live-Telemetrie Start
        if (appConfig.mode === 'Live Telemetry') {
            const transRes = await (0, enquirer_1.prompt)({
                type: 'select',
                name: 'transmissionMode',
                message: 'Übertragungsfrequenz wählen:',
                choices: ['Live (60Hz)', 'Balanced (5s)', 'Results Only (60s)']
            });
            appConfig.transmissionMode = transRes.transmissionMode;
            appConfig.intervalMs =
                transRes.transmissionMode === 'Live (60Hz)' ? 16 :
                    transRes.transmissionMode === 'Balanced (5s)' ? 5000 : 60000;
            const { startUdpListener } = await Promise.resolve().then(() => __importStar(require('./udpListener')));
            startUdpListener(appConfig);
            return;
        }
        // Schnelle Nachverarbeitung von lokalen Aufzeichnungen (.bin Dateien)
        if (appConfig.mode === 'Fast Process Recordings') {
            const { fastProcessRecordings } = await Promise.resolve().then(() => __importStar(require('./fastProcess')));
            await fastProcessRecordings(appConfig);
        }
        // Simuliertes Abspielen einer Session zur UI-Entwicklung
        if (appConfig.mode === 'Playback Recording (Legacy)') {
            const { startPlayback } = await Promise.resolve().then(() => __importStar(require('./playback')));
            await startPlayback(appConfig);
        }
    }
}
// Fehlerbehandlung für den globalen Scope
main().catch(err => {
    console.error('Kritischer Fehler beim Starten der Anwendung:', err);
    process.exit(1);
});
