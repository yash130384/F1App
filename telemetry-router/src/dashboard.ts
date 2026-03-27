import readline from 'readline';
import { AppConfig } from './index';

/**
 * Repräsentiert den aktuellen Status für die Terminal-Anzeige.
 */
export interface DashboardState {
    /** Eindeutige Session-ID (momentan meist 'aktuell'). */
    sessionId: string;
    /** Name der Rennstrecke. */
    trackName: string;
    /** Typ der Sitzung (Training, Rennen, etc.). */
    sessionType: string;
    /** Ob gerade aktiv Daten empfangen werden. */
    isActive: boolean;
    /** Gesamtzahl der verarbeiteten Pakete. */
    packetCount: number;
    /** Zeitstempel des letzten Pakets in Millisekunden. */
    lastPacketTime: number;
}

/**
 * Rendert eine kompakte Übersicht des aktuellen Status direkt in das Terminal.
 * Löscht bei jedem Aufruf die Konsole für einen sauberen "Live-Dashboard" Effekt.
 * 
 * @param config Die globale Anwendungskonfiguration.
 * @param state Der aktuelle Zustand aus dem SessionState.
 */
export function renderDashboard(config: AppConfig, state: DashboardState) {
    const rl = readline.createInterface({
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
