# F1App – Ligaverwaltung & Telemetrie-Dashboard

Eine Next.js-Anwendung zur Verwaltung von F1-Ligen, Rennergebnissen und Live-Telemetrie-Auswertung aus F1 25.

## Features

- 🏆 Liga- und Fahrerverwaltung mit individuellem Punktesystem
- 🏁 Rennergebnisse mit automatischer Wertungsberechnung (inkl. Streichresultate)
- 📊 Meisterschaftsverlauf als Graph
- 📡 Live-Telemetrie-Integration mit UDP-Router
- 🔍 Detaillierte Fahrerauswertung: Sektorzeiten, Reifenstrategie, Schadensreport
- 📈 Positionsverlauf-Graph pro Runde
- 🚗 Safety-Car-Phasen als Referenzlinien in Telemetrie-Graphen

## Voraussetzungen

- Node.js 18+
- PostgreSQL-Datenbank (empfohlen: [Neon](https://neon.tech))
- F1 25 (PC/Konsole) mit aktivierter UDP-Telemetrie
- Telemetry-Router (im Unterordner `telemetry-router/`)

## Setup

### 1. Repository klonen

```bash
git clone <repo-url>
cd F1App
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

Datei `.env.local` im Hauptverzeichnis erstellen:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### 4. Datenbank initialisieren

Die Schema-Initialisierung erfolgt automatisch beim ersten Start der App.  
Optional kann die Migration manuell ausgeführt werden:

```bash
node scripts/migrate_to_neon.mjs
```

### 5. App starten

```bash
npm run dev
```

Die App ist unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Nutzung

### Liga anlegen

1. Im Admin-Bereich (`/admin`) eine neue Liga erstellen
2. Fahrer hinzufügen und optional **In-Game Namen** vergeben (für Telemetrie-Zuordnung)
3. Punktekonfiguration anpassen

### Rennen manually hinzufügen

Im Admin-Bereich unter „Ergebnisse" → Ergebnis manuell eintragen.

### Telemetrie-Integration

1. Telemetry-Router starten (siehe `telemetry-router/README.md`)
2. F1 25 UDP-Telemetrie aktivieren (IP des PCs, Port 20777)
3. Rennen fahren – Daten werden automatisch erfasst und am Saisonende promoted

### Admin-Hub

Erreichbar unter `/admin` mit dem Admin-Passwort der Liga:
- Spieler zuordnen
- Sessions promoten
- Ergebnisse korrigieren

## Technologie

- **Framework**: Next.js 15 (App Router)
- **Datenbank**: PostgreSQL via Neon (serverless)
- **Styling**: Vanilla CSS (F1-Design-System)
- **Charts**: Recharts
- **Telemetrie**: Node.js UDP-Router (separates Paket)

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| Datenbank verbindet nicht | `DATABASE_URL` in `.env.local` prüfen |
| Telemetrie wird nicht erfasst | Router läuft? F1-UDP-IP korrekt? |
| Fahrer nicht zugeordnet | In-Game-Namen im Admin setzen |
| Build-Fehler | `npm install` erneut ausführen |
