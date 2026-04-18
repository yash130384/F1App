# Realisierungsplan: F1 2025 Telemetrie Profil-Integration

Die Telemetrie-Analyse wird direkt in die bestehende `F1App` integriert. Spieler können über ihr Profil exakt die Rennen aufrufen, an denen ihr Steam-/Ingame-Name teilgenommen hat.

## Proposed Changes

### 1. Daten-Pipeline & Profil-Zuordnung
- **Client-Side Parser**: Der User wählt die `.bin`-Datei. Ein Web Worker in Next.js verarbeitet diese lokal.
- **Filtering**: Alle KI-Autos werden verworfen. Zurück bleiben ca. 5-20MB JSON der Menschen inkl. ihrer Namen (aus `m_name`).
- **Cloud Storage (Vercel Blob)**: Das reine Telemetrie-JSON landet auf Vercel Blob und entlastet die Datenbank von Heavy-Payloads.
- **Neon Postgres (Drizzle)**: Das Server Backend speichert die Metadaten in zwei verknüpften Tabellen: `telemetry_sessions` und `session_participants`. So ordnen wir jeden Spielernamen exakt seiner Session zu.
- **Profil Dashboard**: Wenn ein angemeldeter User (z.B. per Auth) oder ein öffentliches Profil (`/profile/Name`) aufgerufen wird, holt Neon DB alle `session_id`s aus `session_participants` und zeigt eine History an Rennen. Ein Klick auf ein Rennen öffnet den Analyzer und zieht das Blob-Target.

### 2. Detaillierte Modul-Architektur für Agenten

#### Modul A: Schema & Mapping (`src/lib/...`)
- Drizzle ORM Relationen (`telemetry_sessions` 1:N `session_participants`).
- Backend-Action nimmt geparsten JSON-Payload (inklusive der Namen) an, lädt die Daten zu Blob, schreibt dann die DB-Rows sicher in einer ACID-Transaktion auf Neon.

#### Modul B: Teil 1 - Lap & Corner Analyse (`src/components/analyzer/...`)
- Filtert Telemetrie automatisch auf die eigene Runde des Users anhand seines Profilnamens.
- Canvas Renderer für die 2D-Strecke. Brush-Interaction für Distanz-Selektion und synchrone Liniendiagramme (Gas, Bremse, Speed).

#### Modul C: Teil 2 - Race Analyse (`src/components/analyzer/...`)
- Visualisierung der Reifenstints und des Verschleißes.
- Gap Chart Berechnungen zum Führenden.
- Schadensanzeige (Damage Report) und G-Force.

## Verification Plan
1. **Validation 1 (Database)**: Drizzle Relationstests stellen sicher, dass eine gefundene Session korrekt mit z.B. 12 Einträgen (`session_participants`) in Neon landet.
2. **Validation 2 (Parsing & Profile Match)**: Ein Profile-Render-Test prüft, dass der im Profil gesuchte Name via SQL/Drizzle Case-Insensitive korrekt gematched wird und das Thumbnail/Eintrag zur Session spawnt.
