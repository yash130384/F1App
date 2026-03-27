import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { AppConfig } from './index';
import { SessionState } from './state';

/**
 * Startet den Sender-Modus, der die gesammelten Telemetriedaten regelmäßig überträgt.
 * Unterstützt sowohl die Live-Übertragung an eine API als auch die lokale JSON-Aufzeichnung.
 * 
 * @param config Die globale Anwendungskonfiguration.
 * @param state Der aktuelle Session-Zustand.
 */
export function startSender(config: AppConfig, state: SessionState) {
    // --- LOKALER AUFZEICHNUNGS-MODUS (JSON) ---
    if (config.mode === 'Local Recording') {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        const filename = path.join(logsDir, `recording_${Date.now()}.json`);
        console.log(`📡 Zeichne lokale Daten auf in: ${filename}`);

        fs.writeFileSync(filename, '[\n');
        let isFirst = true;

        setInterval(() => {
            const payload = state.buildPayloadAndClear();
            // Nur aufzeichnen, wenn Teilnehmer vorhanden sind und die Session bekannt ist
            if (payload.participants.length > 0 && payload.sessionType !== 'Unknown') {
                const line = (isFirst ? '' : ',\n') + JSON.stringify(payload);
                fs.appendFileSync(filename, line);
                isFirst = false;
            }
        }, config.intervalMs);

        // Sicherstellen, dass das JSON-Array beim Beenden korrekt geschlossen wird
        process.on('SIGINT', () => {
            console.log('Beende Router und speichere Aufzeichnung...');
            fs.appendFileSync(filename, '\n]');
            process.exit();
        });

        return;
    }

    // --- LIVE-ROUTING MODUS (HTTP POST) ---
    console.log(`🚀 Starte Live-Übermittlung an ${config.url}`);
    console.log(`   Modus: ${config.transmissionMode} (Intervall: ${config.intervalMs}ms)`);

    setInterval(async () => {
        // Zustand abrufen und temporäre Buffer (z.B. neue Runden) leeren
        const payload = state.buildPayloadAndClear();

        // ÜBERMITTLUNGS-FILTER:
        // Wir senden Daten nur, wenn mindestens ein menschlicher Fahrer in der Session ist. 
        // Dies verhindert das Überfluten der API mit reinen KI-Sessions.
        const hasHumans = payload.participants.some(p => p.isHuman);

        if (hasHumans) {
            const body = {
                leagueId: config.leagueId,
                packet: payload
            };

            // AbortController für Timeouts verwenden, um hängende Verbindungen zu vermeiden
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
                    console.error(`Fehler beim Senden: HTTP-Status ${res.status}`);
                }
            } catch (e: any) {
                clearTimeout(timeoutId);
                console.error(`Netzwerkfehler beim Senden der Telemetrie: ${e.message}`);
            }
        }
    }, config.intervalMs);
}
