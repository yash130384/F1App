# F1 Telemetry Router

Empfängt UDP-Telemetriepakete von F1 25 und sendet aggregierte Daten an die F1App-API.

## Was der Router macht

- Lauscht auf UDP-Port (Standard: `20777`)
- Parst F1 25 Pakete (Session, Runden, Teilnehmer, Telemetrie, Schäden, Positionen)
- Speichert **nur Runden von menschlichen Fahrern**
- Sendet alle ~5 Sekunden gebündelte Daten an die F1App
- Erfasst: Sektorzeiten (S1/S2/S3), Schadensstatus, Safety-Car-Events, Positionsverlauf

## Voraussetzungen

- Node.js 18+
- F1 25 auf demselben PC oder im gleichen Netzwerk
- Laufende F1App (Next.js)

## Setup

```bash
cd telemetry-router
npm install
```

Konfigurationsdatei `config.json` erstellen (oder Umgebungsvariablen nutzen):

```json
{
  "port": 20777,
  "apiUrl": "http://localhost:3000/api/telemetry",
  "leagueId": "DEINE_LIGA_ID",
  "sendIntervalMs": 5000
}
```

## Starten

```bash
# Entwicklungsmodus
npm run dev

# Oder kompilieren und starten
npm run build
npm start
```

## F1 25 Einstellungen

In F1 25 unter **Einstellungen → Telemetrie**:

| Einstellung | Wert |
|---|---|
| UDP Telemetrie | **Aktiviert** |
| UDP Broadcast | **Aus** |
| UDP IP | IP-Adresse des PCs mit dem Router |
| UDP Port | `20777` |
| UDP Sendefrequenz | **60 Hz** (oder höher) |
| Deine Telemetrie | **Öffentlich** |

## Verarbeitete Pakete

| Paket ID | Typ | Inhalt |
|---|---|---|
| 1 | Session | Strecke, Sessiontyp, Safety-Car-Status |
| 2 | Rundendaten | Zeiten, Sektoren, Position, Grid |
| 3 | Events | Session-Ende, Safety-Car (SCAR) |
| 4 | Teilnehmer | Namen, AI/Human, Team |
| 6 | Telemetrie | Geschwindigkeit, Gänge |
| 7 | Fahrzeugstatus | Reifen-Compound |
| 10 | Fahrzeugschäden | Flügel, Motor, Getriebe, ... |
| 15 | Rundenpositionen | Positionsverlauf aller Autos |

## Gespeicherte Daten

Für jede **menschliche Fahrer-Runde**:
- Rundenzeit + Sektorzeiten (S1, S2, S3)
- Reifen-Compound
- Pit-Lap-Flag
- Fahrzeugschadens-Snapshot

Für die Session:
- Safety-Car-Events (Typ + Runde)
- Positionsverlauf pro Runde (aus Paket 15)

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| `sessionType: Unknown` | Packet-Parsing prüfen; F1-Session aktiv? |
| `participants: 0` | Paket 4 empfangen? UDP-Port korrekt? |
| Daten werden nicht gesendet | `apiUrl` und `leagueId` in config prüfen |
| Nur AI-Runden erfasst | `isHuman` aus Teilnehmer-Paket prüfen |
