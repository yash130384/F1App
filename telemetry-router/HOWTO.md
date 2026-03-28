# F1 Telemetry Router - Kurzanleitung

Dieses Projekt wurde modernisiert und läuft nun als Electron-Hintergrundanwendung mit System-Tray-Icon.

## 🚀 Starten des Routers

1. **Abhängigkeiten installieren** (nur beim ersten Mal):
   Öffne ein Terminal im Ordner `telemetry-router` und führe aus:
   ```bash
   npm install
   ```

2. **Router starten**:
   Führe den folgenden Befehl aus, um den Router mit der grafischen Benutzeroberfläche zu starten:
   ```bash
   npm run electron
   ```

3. **Verwendung**:
   - Der Router nistet sich unten rechts im **System-Tray** ein.
   - **Rechtsklick** auf das Icon: Beenden oder Einstellungen öffnen.
   - **Status**: Das Icon ist grau im Standby und wird **leuchtend grün**, sobald Daten von F1 25 empfangen werden.
   - **Einstellungen**: Hier kannst du den Port (Standard 20777), die Backend-URL und den Autostart konfigurieren.

## 📊 F1 25 Features
Der neue Router erfasst automatisch:
- **Setups**: Alle Flügel- und Differenzial-Einstellungen.
- **Speed Traps**: Höchstgeschwindigkeiten an Messpunkten.
- **Track Intel**: Automatische Erkennung der Kurvennamen (z.B. "Eau Rouge") dank der integrierten Lovely-Track-Data.
- **Human-Only**: Es werden nur Daten von echten Spielern in die Datenbank übertragen.

---
Viel Spaß beim Testen!
