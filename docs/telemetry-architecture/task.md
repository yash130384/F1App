# F1 2025 Telemetry Analysis - Agent-Tasks (F1App Integration)

## 1. Storage & Integration Setup (F1App)
- [ ] Installiere `@vercel/blob` im `F1App` Repository.
- [ ] Drizzle Schema erweitern: 
  - `telemetry_sessions` (id, track, date, blob_url).
  - `session_participants` (id, session_id, player_name_or_steam_id).
- [ ] Implementiere API Route für Uploads: Speichert JSON im Blob und extrahiert alle Fahrernamen für die DB.
- [ ] Baue Profil-Ansicht unter `/profile/[name]`, die alle Sessions eines Spielers via SQL-Join aus der `session_participants` Tabelle abruft.

## 2. In-Browser Parser Worker (Web Worker)
- [ ] Integriere das TS-Parser Modul (C++ Structs) in `src/lib/parser`.
- [ ] Erstelle Web Worker, der die 700MB Datei via File-Input streamt.
- [ ] **Striktes KI-Filtering**: Verwerfe alles mit `m_aiControlled == 1`.
- [ ] Behalte `m_name` der menschlichen Fahrer, um sie in den Payload für das Backend zu integrieren.
- [ ] Aggregiere Daten (5-20MB JSON) und sende sie samt der Teilnehmerliste ans Backend.

## 3. Lap & Corner Analysis Module
- [ ] Lade die Blob-JSON für die gewählte Session.
- [ ] **2D Strecke**: Canvas/SVG Komponente unter `src/components/analyzer/`, zeichnet `m_worldPositionX/Z`.
- [ ] **Line-Routing**: Bestzeit (Referenz) vs. Eigene Runde.
- [ ] **Brush-Tool**: Selektion eines Track-Abschnitts (über `m_lapDistance`).
- [ ] **Telemetrie-Graphen**: Recharts Rendering (Gas, Bremse, ERS, Speed) absolut synchron zum gewählten Abschnitt.

## 4. Race Analysis Module
- [ ] **Reifen-Degradation**: Aggregation von `m_tyresWear`. Line-Graph über alle Runden je Fahrer.
- [ ] **Damage Report**: Lade maximale Damage-Werte pro Auto.
- [ ] **Gap Analysis Chart**: `m_deltaToRaceLeaderMSPart` Kurvenverlauf aller Menschen zum Führenden.
- [ ] **Pit Stops**: Nutze `TyreStintsHistoryData` für visuelle Boxen-Timeline.
- [ ] **G-Force Analysis**: Parse Lat/Long G-Forces und zeichne Traction-Circle pro Runde.

## 5. QA & Performance
- [ ] Überprüfe das Profil-Dashboard auf Drizzle/DB Ladezeiten (Relationen).
- [ ] Recharts Downsampling für Telemetrie-Punkte > 5.000.
