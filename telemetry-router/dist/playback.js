import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;
/**
 * Startet den Playback-Modus für Legacy-JSON-Aufzeichnungen.
 * Dieser Modus erlaubt es, eine zuvor als JSON gespeicherte Session erneut an die API zu senden.
 * Dies ist besonders nützlich für die Entwicklung des Frontends ohne laufendes Spiel.
 *
 * @param config Die globale Anwendungskonfiguration.
 */
export async function startPlayback(config) {
    console.log('\n--- Wiedergabemodus (Legacy JSON) ---');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        console.error('Kein "logs" Verzeichnis gefunden.');
        return;
    }
    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.error('Keine JSON-Aufzeichnungen in ./logs gefunden.');
        return;
    }
    // Interaktive Auswahl der Aufzeichnung
    const response = await prompt({
        type: 'select',
        name: 'file',
        message: 'Wählen Sie eine Datei zur Wiedergabe:',
        choices: files
    });
    const fileData = fs.readFileSync(path.join(logsDir, response.file), 'utf-8');
    let jsonData;
    try {
        let text = fileData.trim();
        // Repariert automatisch JSON-Arrays, die durch Programmabbruch nicht geschlossen wurden
        if (!text.endsWith(']'))
            text += '\n]';
        jsonData = JSON.parse(text);
    }
    catch (e) {
        console.error('Fehler beim Parsen der Aufzeichnung. Stellen Sie sicher, dass es sich um gültiges JSON handelt.');
        return;
    }
    console.log(`Geladen: ${jsonData.length} Datenpunkte.`);
    console.log(`Starte Wiedergabe an ${config.url} im ${config.intervalMs}ms Intervall...`);
    let index = 0;
    const timer = setInterval(async () => {
        if (index >= jsonData.length) {
            console.log('✅ Wiedergabe abgeschlossen.');
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
            const res = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                console.error(`Fehler beim Senden von Block ${index}, Status: ${res.status}`);
            }
            else {
                process.stdout.write(`\rSende Block ${index} / ${jsonData.length}...`);
            }
        }
        catch (e) {
            console.error(`\nNetzwerkfehler beim Senden von Block ${index}: ${e.message}`);
        }
    }, config.intervalMs);
}
