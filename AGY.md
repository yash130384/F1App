# AGY.md — Antigravity F1App Masterplan & Projekt-Dokumentation

**Projekt:** F1App  
**Pfad:** `/home/yash/Projects/F1App`  
**GitHub:** [https://github.com/yash130384/F1App](https://github.com/yash130384/F1App)  
**Datum:** 17. September 2026  
**Status:** In Planung / Freigabe-Entwurf  

---

## Inhaltsverzeichnis
1. [Projektüberblick & Zielsetzung](#1-projektüberblick--zielsetzung)
2. [Gründliche Repository- & Architekturanalyse](#2-gründliche-repository---architekturanalyse)
   - [Tech-Stack & Versionen](#tech-stack--versionen)
   - [Verzeichnisstruktur & Verantwortlichkeiten](#verzeichnisstruktur--verantwortlichkeiten)
   - [Datenbank-Architektur & Datenmodell](#datenbank-architektur--datenmodell)
   - [Telemetrie-Pipeline (F1 25 UDP & Analysis)](#telemetrie-pipeline-f1-25-udp--analysis)
   - [Bisherige Schwachstellen & Reibungspunkte](#bisherige-schwachstellen--reibungspunkte)
3. [Spezifikation der Anforderungen](#3-spezifikation-der-anforderungen)
   - [Anforderung 1: Public Access & Deaktivierung der User-Accounts](#anforderung-1-public-access--deaktivierung-der-user-accounts)
   - [Anforderung 2: Admin-Bereich mit PIN '009981'](#anforderung-2-admin-bereich-mit-pin-009981)
   - [Anforderung 3: Model Context Protocol (MCP) Server](#anforderung-3-model-context-protocol-mcp-server)
   - [Anforderung 4: Season 3 Setup & Rennergebnisse](#anforderung-4-season-3-setup--rennergebnisse)
4. [Detaillierter Umsetzungsplan (Phasen)](#4-detaillierter-umsetzungsplan-phasen)
   - [Phase 1: Environment, Dependencies & Datenbank-Anbindung](#phase-1-environment-dependencies--datenbank-anbindung)
   - [Phase 2: Entfernung der User-Auth & Freischaltung des öffentlichen Zugangs](#phase-2-entfernung-der-user-auth--freischaltung-des-öffentlichen-zugangs)
   - [Phase 3: Implementierung des Admin-Systems mit PIN '009981'](#phase-3-implementierung-des-admin-systems-mit-pin-009981)
   - [Phase 4: Entwicklung des Model Context Protocol (MCP) Servers](#phase-4-entwicklung-des-model-context-protocol-mcp-servers)
   - [Phase 5: Season 3 Datenbank-Setup, Fahrer- & Rennerfassungs-Skript](#phase-5-season-3-datenbank-setup-fahrer---rennerfassungs-skript)
5. [Abhängigkeiten, Risiken & Mitigationen](#5-abhängigkeiten-risiken--mitigationen)
6. [Test- & Verifizierungsstrategie](#6-test---verifizierungsstrategie)

---

## 1. Projektüberblick & Zielsetzung

Die **F1App** ist eine spezialisierte Plattform zur Verwaltung von virtuellen Formula 1 Ligen (speziell F1 25), Rennwertungen und hochauflösenden Telemetrie-Auswertungen. 

Bislang war das System an ein klassisches Benutzer- und Authentifizierungskonzept (NextAuth mit Registrierung, Passwörtern und User-Accounts) gebunden. Dies erzeugte unnötige Hürden für die Ligamitglieder und Besucher, die lediglich Standings, Rennanalysen, Zeitabstände und Telemetriedaten einsehen wollen.

### Kernziele dieser Neuausrichtung:
1. **100% Öffentlicher Zugriff (Zero Login Barrier):** Dashboard, Meisterschafts-Tabellen, Rennstatistiken, Telemetriekurven, Reifenstrategien und Vergleiche sind für jeden Besucher sofort und ohne Anmeldung erreichbar.
2. **Erhöhte Administrationssicherheit per PIN:** Ein einziger, robuster Administrationszugang (`/admin`), fest gekoppelt an den 6-stelligen Code **`009981`**, ermöglicht dem Rennleiter die vollständige Pflege aller Ligen, Fahrer, Teams, Rennkalender und Rennergebnisse.
3. **Autonomer KI-Agentenzugriff via MCP:** Bereitstellung eines standardisierten Model Context Protocol (MCP) Servers im Repository, über den KI-Modelle Ligen steuern, Ergebnisse einpflegen und Rennrecap-Screenshots vollautomatisch parsen und speichern können.
4. **Offizieller Saisonstart 'Season 3':** Etablierung der neuen Meisterschaft mit ausschließlich den vier menschlichen Fahrern (*kaydn87*, *Markus Lanz*, *Dox23y5*, *Richard David Precht*) und Erfassung der drei bereits gefahrenen Rennen (Spa, Silverstone, Red Bull Ring).

---

## 2. Gründliche Repository- & Architekturanalyse

### Tech-Stack & Versionen
- **Frontend / Framework:** Next.js 16.1.6 (App Router mit React 19.2.3 und TypeScript 5).
- **Datenbank:** PostgreSQL (Neon Serverless) via `@neondatabase/serverless` v1.1.0 und `drizzle-orm` v0.45.2.
- **Styling:** Modular gestaltetes, responsives Custom CSS im offiziellen F1-Design-System (Kohlefaser-Texturen, F1-Rot `#E10600`, F1-Display-Typografie).
- **Visualisierung:** `recharts` v3.7.0 für Lap-Pace, Reifenabbau, Strecken-Gaps und Meisterschaftsverläufe.
- **Testing:** Vitest 4.1.2 mit `@testing-library/react` und `@testing-library/jest-dom`. Playwright 1.58.1 für E2E.
- **Telemetrie-Engine:** Standalone Node.js UDP-Router (`telemetry-router/`) für F1 25 UDP-Pakete (Port 20777).
- **Vision / OCR:** Google Generative AI SDK (`@google/generative-ai` v0.24.1) in `/api/extract-results`.

### Verzeichnisstruktur & Verantwortlichkeiten

```
F1App/
├── AGY.md                                # Zentrales Master-Planungs- und Projekt-Dokument
├── package.json                          # App-Dependencies & Build-Skripte
├── drizzle.config.ts                     # Drizzle ORM Schema-Konfiguration
├── src/
│   ├── app/
│   │   ├── admin/                        # [NEU] Zentraler Admin-Hub mit PIN-Gate ('009981')
│   │   ├── dashboard/                    # Öffentliches Meisterschafts-Dashboard & Grafiken
│   │   ├── race/[id]/                    # Öffentlicher Rennbericht & Session-Auswertung
│   │   │   └── driver/[driverId]/        # Einzelfahrer-Rennanalyse (Sektoren, Runden, Setup)
│   │   ├── profile/
│   │   │   ├── analysis/                 # Öffentliche Telemetrie-Sessions Übersicht
│   │   │   │   └── [sessionId]/          # Detaillierte Pedal-, Kurven- & Speedtrap-Analyse
│   │   │   └── leagues/[leagueId]/       # Admin-Liga-Management (Races, Results, Scoring, Teams)
│   │   ├── live/                         # Live-Telemetrie Stream (SSE)
│   │   ├── telemetryupload/              # Telemetrie-Upload Interface
│   │   └── api/                          # Next.js API Routes (Live-Stream, Session Meta, OCR)
│   ├── components/
│   │   ├── analysis/                     # Telemetrie-Graphen (GGCircle, GapToLeader, RacePace, TyreAnalysis)
│   │   ├── live/                         # Live-Widgets (Brake, Fuel, Tyre, GForceCrosshair)
│   │   ├── race/                         # Renn-Komponenten (LapPositionChart, TyreStrategyChart)
│   │   └── common/                       # Shared UI (Navigation, DriverAvatar, AdminDropdown)
│   ├── lib/
│   │   ├── actions.ts                    # Next.js Server Actions (DB Queries & Mutationen)
│   │   ├── admin-auth.ts                 # [NEU] Admin PIN-Logik ('009981') mit Secure Cookies
│   │   ├── db.ts                         # Neon PostgreSQL Drizzle Client
│   │   ├── schema.ts                     # Drizzle ORM Schema Definitionen
│   │   ├── scoring.ts                    # F1-Punktesystem & Berechnung
│   │   └── constants.ts                  # Streckenliste 2025/2026 & Farbwerte
│   └── types/                            # TypeScript Typdefinitionen
├── telemetry-router/                     # F1 25 UDP Telemetrie-Receiver & Parser
├── mcp-server/                           # [NEU] Model Context Protocol Server für KI-Agenten
└── scripts/                              # Migrations- und Hilfsskripte
```

### Datenbank-Architektur & Datenmodell

Die Datenbank liegt auf Neon PostgreSQL (`ep-green-mode-aim4s8n8-pooler.c-4.us-east-1.aws.neon.tech/neondb`).
Das Schema in `src/lib/schema.ts` umfasst folgende Kernentitäten:

1. **`leagues`:** Ligen/Saisons (Name, Teams-Lock, Join-Lock, Status). Das Feld `owner_id` verweist optional auf `users.id`, ist aber `NULLABLE`!
2. **`drivers`:** Fahrer innerhalb einer Liga (Name, Team, TeamId, Spielfarbe, In-Game Name, Gesamtpunkte). Das Feld `user_id` ist `NULLABLE`!
3. **`teams`:** Rennställe innerhalb einer Liga (z.B. McLaren, Ferrari, Mercedes).
4. **`races`:** Geplante und durchgeführte Rennen (Strecke, Datum, Status, Rundenanzahl).
5. **`race_results`:** Rennergebnisse pro Fahrer und Rennen (Position, Quali-Position, Schnellste Runde, Clean Driver, DNF, Zeitstrafen, erhaltene Punkte).
6. **`points_config`:** Konfigurierbares Punktesystem pro Liga (Standard 25-18-15-..., Bonuspunkte für schnellste Runde, Streichresultate).
7. **`telemetry_*`:** Tabellen für Sessions, Teilnehmer, Rundenzeiten, Stints, Kurven-Samples, Vorfälle, Safety-Car-Phasen und Setups.

> **Wichtige architektonische Erkenntnis:**  
> Da sowohl `leagues.ownerId` als auch `drivers.userId` im Schema als `NULLABLE` deklariert sind, können Ligen und Fahrer vollständig ohne User-Accounts existieren. Es ist **keine** destruktive Schema-Migration der relationalen Fremdschlüssel notwendig.

### Telemetrie-Pipeline (F1 25 UDP & Analysis)

```mermaid
flowchart LR
    F1[F1 25 Game / PC] -- UDP Port 20777 --> TR[telemetry-router]
    TR -- HTTP Batch Upload --> Neon[(Neon DB)]
    Neon --> API[/api/telemetry]
    API --> UI[Next.js Analysis Dashboard]
```

- **Router:** Der Router im Ordner `telemetry-router/` lauscht auf UDP-Pakete (Format F1 2025/2026), aggregiert Rundenzeiten, Car Damage, Reifenverschleiß und Sektorzeiten und lädt die Sessions in die Neon-PostgreSQL-Datenbank hoch.
- **Frontend-Visualisierung:** Die Komponenten in `src/components/analysis/` und `src/components/race/` lesen die Sessions aus und stellen sie über Recharts dar (inkl. farblicher Reifensätze, Rundenzeitvergleich und Safety-Car-Bänder).

### Bisherige Schwachstellen & Reibungspunkte

1. **Unnötiger Auth-Lockout:** Besucher mussten sich registrieren und einloggen, um grundlegende Seiten zu sehen. `TelemetryNav` und `profile/analysis` waren hart an `session?.user` gebunden.
2. **Fragmentierte Admin-Prüfung:** Bisherige Server-Actions prüften `session?.user?.id === league.ownerId`. Wenn ein User nicht eingeloggt war oder die Liga nicht angelegt hatte, schlug jede Verwaltungsaktion mit `NOT_AUTHORIZED` fehl.
3. **Fehlendes `/admin` Routing:** Es gab kein eigenständiges Dashboard für den Rennleiter; das Dropdown in der Navigation war für unangemeldete Besucher unsichtbar.
4. **Fehlende KI-Schnittstelle:** Ein KI-Agent konnte bislang keine Rennergebnisse ohne Umweg über Browser-Simulation oder rohe SQL-Skripte eintragen.

---

## 3. Spezifikation der Anforderungen

### Anforderung 1: Public Access & Deaktivierung der User-Accounts
- **Vollständige Freigabe:**
  - `/dashboard`: Hauptdashboard mit Fahrer- und Konstrukteurs-Tabellen, Rennkalender und Verlaufs-Graphen ist öffentlich.
  - `/race/[id]`: Rennergebnis, Rundenverlauf und Telemetrie öffentlich aufrufbar.
  - `/race/[id]/driver/[driverId]`: Einzelfahrerauswertung öffentlich aufrufbar.
  - `/profile/analysis` & `/profile/analysis/[sessionId]`: Telemetrie-Sessions aller Fahrer öffentlich einsehbar.
  - `/live`: Live-Telemetrie öffentlich einsehbar.
  - `/telemetryupload`: Datei-Upload für Telemetrie-Logs öffentlich zugänglich.
- **Entfernung der Account-Elemente:**
  - Entfernen von `AuthNav` (Login/Register/Logout Buttons) aus `src/app/layout.tsx`.
  - Hinzufügen von direkten Navigations-Links zu **Standings**, **Rennen**, **Telemetrie** und **Admin**.
  - Entfernen der Zugriffssperren (`if (!session) return null;` in `TelemetryNav.tsx` und Redirects in `profile/analysis/page.tsx`).
  - `/login` und `/register` leiten direkt auf `/dashboard` weiter oder informieren über den öffentlichen Modus.

### Anforderung 2: Admin-Bereich mit PIN '009981'
- **Fester Passcode:** `009981`.
- **Sicherheits- & Session-Konzept:**
  - Bei Aufruf von `/admin` (oder Klick auf Admin in der Navigation):
    - Wenn nicht autorisiert: Anzeige eines geschützten, abgedunkelten F1-Passcode-Modals bzw. Login-Screens ("ENTER ADMIN PASSCODE").
    - Bei Eingabe von `009981`: Serverseitige Verifizierung via Server Action `verifyAdminPasscode('009981')`.
    - Setzen eines verschlüsselten, HTTP-Only Cookies `f1_admin_token` (Gültigkeit: 7 Tage).
    - Bei fehlerhafter Eingabe: Visuelles Error-Feedback ("INVALID ACCESS CODE").
  - Serverseitige Berechtigungsprüfung:
    - Die Funktion `ensureAdmin(leagueId?: string)` in `src/lib/actions.ts` wird refaktoriert: Sie validiert das Vorhandensein und die Gültigkeit des `f1_admin_token` Cookies.
    - Wenn valide, besitzt der Rennleiter vollen administrativen Zugriff auf **alle** Ligen und Aktionen (Ergebnisse speichern, Rennen terminieren/löschen, Punktesystem anpassen, Fahrer/Teams verwalten).
  - Admin-Navigation & Dashboard:
    - Neue Route `src/app/admin/page.tsx`: Übersicht aller Ligen, Schnellzugriff auf "Season 3", Direkteinstieg in Rennerfassung, Fahrerzuweisung und Telemetrie-Zuordnung.
    - Ausloggen-Funktion (`clearAdminSessionCookie`), die den Cookie löscht und zur PIN-Abfrage zurückkehrt.

### Anforderung 3: Model Context Protocol (MCP) Server
Ein eigenständiger, robuster MCP-Server im Unterverzeichnis `mcp-server/`, geschrieben in TypeScript/Node.js, der über den Standard `stdio` transportiert wird und folgende Tools bereitstellt:

1. `f1_list_leagues`: Gibt alle existierenden Ligen mit ID, Name, Rennanzahl und Abschluss-Status zurück.
2. `f1_get_league`: Liefert vollständige Details einer Liga (Fahrerliste, Teams, Rennkalender, Punktekonfiguration).
3. `f1_create_league`: Legt eine neue Liga mit individuellem Namen und optionalen Punktesystem-Parametern an.
4. `f1_manage_drivers`: Ermöglicht das Hinzufügen, Aktualisieren und Auflisten von Fahrern (Name, Team, Spielfarbe, In-Game Name).
5. `f1_manage_teams`: Erstellen und Verwalten von Rennställen (Name, Farbe).
6. `f1_schedule_race`: Plant ein Rennen im Kalender (Strecke, Datum, Rundenanzahl, Zufalls-Modus).
7. `f1_record_race_results`: Trägt Rennergebnisse für eine Strecke/Rennen ein (Fahrerpositionen, Schnellste Runde, Clean Driver, DNF, Zeitstrafen, Rennzeiten) und berechnet automatisch die Punkte.
8. `f1_parse_and_record_screenshot`: Akzeptiert einen Screenshot-Pfad oder ein Bild (Base64) eines F1 25 Ergebnisbildschirms, extrahiert die Platzierungen, schnellste Runden und Strafen und trägt diese direkt in die Datenbank ein.
9. `f1_get_standings`: Berechnet und liefert die aktuelle Fahrer- und Konstrukteurs-Meisterschaftstabelle inklusive Rennsiegen und Podien.
10. `f1_recalculate_points`: Führt eine vollständige Neuberechnung aller Meisterschaftspunkte einer Liga auf Basis des definierten Punktesystems durch.

### Anforderung 4: Season 3 Setup & Rennergebnisse

#### Liga-Konfiguration:
- **Name:** `Season 3`
- **Wertung:** **Ausschließlich 4 menschliche Fahrer** werden gewertet. KI-Fahrer werden komplett ignoriert und erscheinen nicht in der Wertung.
- **Fahrer-Roster:**
  1. **kaydn87** (Farbe: `#E8002D` F1 Red)
  2. **Markus Lanz** (Farbe: `#FF8000` Papaya McLaren Orange)
  3. **Dox23y5** (Farbe: `#00D2BE` Mercedes Cyan)
  4. **Richard David Precht** (Farbe: `#7F8C8D` Silver/Grey)
- **Teams:**
  - McLaren (`#FF8000`)
  - Mercedes (`#00D2BE`)
  - Ferrari (`#E8002D`)
- **Punktesystem:**
  - P1: 25 | P2: 18 | P3: 15 | P4: 12 | P5: 10 | P6: 8 | P7: 6 | P8: 4 | P9: 2 | P10: 1
  - Schnellste Runde (FL): +1 Bonuspunkt
  - Clean Driver (CD): 0 Punkte
  - DNF: 0 Punkte

#### Bisherige Rennergebnisse:

##### Rennen 1: Circuit de Spa-Francorchamps (22 Runden)
- **Strecke:** Spa (Track ID 10)
- **P1:** Markus Lanz (McLaren) ➔ 25 Punkte
- **P2:** kaydn87 (Mercedes) ➔ 18 Punkte
- **P3:** Dox23y5 (Mercedes) ➔ 15 Punkte
- **P4 / DNF:** Richard David Precht (Independent) ➔ DNF, 0 Punkte

##### Rennen 2: Silverstone Circuit (Großbritannien)
- **Strecke:** Silverstone (Track ID 7)
- **P1:** kaydn87 (Ferrari, Rennzeit 41:44.229) ➔ 25 Punkte
- **P2:** Dox23y5 (Mercedes, Schnellste Runde 1:32.099) ➔ 18 Punkte + 1 FL = 19 Punkte
- **P3:** Markus Lanz (McLaren, +3s Zeitstrafe) ➔ 15 Punkte (3s Penalty vermerkt)
- *Richard David Precht:* Nicht angetreten (DNS) ➔ 0 Punkte

##### Rennen 3: Red Bull Ring (Österreich)
- **Strecke:** Austria (Track ID 17)
- **P1:** kaydn87 (Ferrari, Schnellste Runde 1:08.761, Rennzeit 43:08.470) ➔ 25 Punkte + 1 FL = 26 Punkte
- **P2:** Markus Lanz (McLaren, +3s Zeitstrafe) ➔ 18 Punkte (3s Penalty vermerkt)
- **P3:** Dox23y5 (Mercedes, DNF) ➔ DNF, 0 Punkte
- *Richard David Precht:* Nicht angetreten (DNS) ➔ 0 Punkte

#### Errechnete Gesamtwertung der Fahrer nach 3 Rennen:
| Pos | Fahrer | Team | Spa | Silverstone | Spielberg | Gesamtpunkte | Siege | Podien |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **kaydn87** | Ferrari / Mercedes | 18 | 25 | 26 (FL) | **69** | 2 | 3 |
| **2** | **Markus Lanz** | McLaren | 25 | 15 (+3s) | 18 (+3s) | **58** | 1 | 3 |
| **3** | **Dox23y5** | Mercedes | 15 | 19 (FL) | 0 (DNF) | **34** | 0 | 2 |
| **4** | **Richard David Precht** | Independent | 0 (DNF) | - | - | **0** | 0 | 0 |

---

## 4. Detaillierter Umsetzungsplan (Phasen)

### Phase 1: Environment, Dependencies & Datenbank-Anbindung
1. **Dependencies installieren:**  
   `npm install` im Projekt-Root ausführen (bislang fehlte `node_modules`).
2. **Umgebungskonfiguration anlegen:**  
   Erstellung von `.env.local` mit dem validierten Neon-Connection-String:
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_CjVQRk2Ksl6B@ep-green-mode-aim4s8n8-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ADMIN_PASSCODE=009981
   ADMIN_SECRET=f1_app_admin_secret_009981_production
   ```
3. **Datenbankverbindung testen:**  
   Verifizieren, dass `drizzle-orm` und `src/lib/db.ts` ohne Latenz oder Timeouts mit Neon kommunizieren.

### Phase 2: Entfernung der User-Auth & Freischaltung des öffentlichen Zugangs
1. **Navigationsleiste bereinigen (`src/app/layout.tsx`):**
   - Entfernen der `AuthNav`-Komponente (keine "LOGIN", "REGISTER", "LOGOUT" Buttons mehr).
   - Einfügen direkter Navigationspunkte:
     - `Standings` (`/dashboard`)
     - `Telemetrie & Sessions` (`/profile/analysis`)
     - `Live Track` (`/live`)
     - `Admin Hub` (`/admin` oder Dropdown mit Passcode-Abfrage).
2. **Telemetrie-Navigation entsperren (`src/components/common/TelemetryNav.tsx`):**
   - `useSession`-Gating entfernen, sodass Upload und Sessions für alle Besucher permanent verfügbar sind.
3. **Session-Analyse öffentlich machen (`src/app/profile/analysis/page.tsx`):**
   - Redirect zu `/api/auth/signin` entfernen.
   - Stattdessen alle erfassten Telemetrie-Sessions aus der Datenbank laden und nach Liga / Datum sortiert für alle Besucher anzeigen.
4. **Alte Auth-Routen neutralisieren:**
   - `/login` und `/register`: Umleitung auf `/dashboard` oder statische Info-Karte mit Link zum Dashboard und Admin-Bereich.

### Phase 3: Implementierung des Admin-Systems mit PIN '009981'
1. **Admin-Auth Modul erstellen (`src/lib/admin-auth.ts`):**
   - Implementierung von `verifyAdminPasscode(passcode: string)`.
   - Kryptografische Generierung des Session-Tokens per HMAC-SHA256.
   - Setzen des HTTP-only Cookies `f1_admin_token`.
   - Bereitstellung von `isAdminAuthenticated()` und `logoutAdmin()`.
2. **Server Actions refaktorisieren (`src/lib/actions.ts`):**
   - `ensureAdmin()` entkoppelt von NextAuth: Prüft nun `await isAdminAuthenticated()`.
   - `getAdminLeagues()`: Gibt bei validem Admin-Token alle verfügbaren Ligen zurück.
   - Admin-Aktionen für Liga-Erstellung, Fahrer, Rennen, Punktestände und Rennergebnisse absichern.
3. **Admin Dashboard erstellen (`src/app/admin/page.tsx`):**
   - State 1 (Nicht authentifiziert): Stilvolles 6-stelliges PIN-Eingabefeld im F1-Design.
   - State 2 (Authentifiziert):
     - Schnellauswahl der Liga (Fokus: `Season 3`).
     - Schnellaktionen: "Ergebnisse eintragen", "Rennen planen", "Fahrer & Teams verwalten", "Punktesystem anpassen", "Telemetrie verknüpfen".
     - Button "Admin abmelden".
4. **Admin-Dropdown anpassen (`src/components/common/AdminDropdown.tsx`):**
   - Direkte Verknüpfung mit `/admin` bzw. Statusanzeige (Gesperrt / Entsperrt).

### Phase 4: Entwicklung des Model Context Protocol (MCP) Servers
1. **Initialisierung im Verzeichnis `mcp-server/`:**
   - Erstellen von `mcp-server/package.json` mit `@modelcontextprotocol/sdk`, `@neondatabase/serverless`, `dotenv`, `zod`.
   - `tsconfig.json` für sauberen TypeScript Build.
2. **Implementierung des MCP-Servers (`mcp-server/src/index.ts`):**
   - Start als StdioServerTransport.
   - Implementierung aller 10 definierten Werkzeuge (`f1_list_leagues`, `f1_get_league`, `f1_create_league`, `f1_manage_drivers`, `f1_manage_teams`, `f1_schedule_race`, `f1_record_race_results`, `f1_parse_and_record_screenshot`, `f1_get_standings`, `f1_recalculate_points`).
3. **Screenshot- & OCR-Integration:**
   - Tool `f1_parse_and_record_screenshot`: Akzeptiert Bilddaten von Ergebnislisten, nutzt das hinterlegte Vision-Modell (oder übergebene Parameter), gleicht Fahrernamen mit den 4 Liga-Fahrern ab und schreibt die Ergebnisse atomar in die Datenbank.
4. **NPM-Skript & Konfiguration:**
   - Root `package.json` ergänzen: `"mcp": "tsx mcp-server/src/index.ts"`.
   - Konfigurationsbeispiel für Antigravity / Claude Desktop / Cursor bereitstellen.

### Phase 5: Season 3 Datenbank-Setup, Fahrer- & Rennerfassungs-Skript
1. **Migrations- und Seeding-Skript erstellen (`scripts/seed_season_3.mjs`):**
   - Überprüfung bestehender Ligen: Konsolidierung der Entwürfe zu einer einheitlichen Liga **`Season 3`**.
   - Punktekonfiguration einspielen (25-18-15-... + 1 FL).
   - Teams anlegen: McLaren (`#FF8000`), Mercedes (`#00D2BE`), Ferrari (`#E8002D`).
   - Die 4 menschlichen Fahrer anlegen & zuordnen:
     * *kaydn87*
     * *Markus Lanz*
     * *Dox23y5*
     * *Richard David Precht*
   - Die 3 Rennen anlegen & Ergebnisse eintragen:
     * Spa (22 Runden): Lanz P1 (25 P), kaydn87 P2 (18 P), Dox23y5 P3 (15 P), Precht P4/DNF (0 P).
     * Silverstone: kaydn87 P1 (25 P), Dox23y5 P2 + FL (19 P), Lanz P3 + 3s Penalty (15 P).
     * Red Bull Ring: kaydn87 P1 + FL (26 P), Lanz P2 + 3s Penalty (18 P), Dox23y5 P3/DNF (0 P).
2. **Punkte-Neuberechnung ausführen:**
   - Validieren, dass der Stand exakt 69 Pkt (kaydn87), 58 Pkt (Lanz), 34 Pkt (Dox), 0 Pkt (Precht) beträgt.
   - Überprüfen, dass die Verlaufs-Graphen im Dashboard alle 3 Rennen korrekt auf der Zeitachse chronologisch zeichnen.

---

## 5. Abhängigkeiten, Risiken & Mitigationen

| Risiko / Abhängigkeit | Auswirkung | Mitigation |
|---|---|---|
| **Fehlende `node_modules`** | App baut und startet lokal nicht | `npm install` im Projekt-Root ausführen; Versionskonflikte durch exakte Versionen in `package.json` vermeiden |
| **Fremdschlüssel `owner_id` & `user_id`** | Mögliche Constraint-Fehler beim Speichern ohne User-Accounts | Schema-Analyse zeigt: Beide Spalten sind in Postgres `NULLABLE`. Ligen und Fahrer können uneingeschränkt ohne User existieren |
| **Next.js 16 & React 19 Typisierung** | Asynchrone Page-Props (`params` / `searchParams` sind Promises) | Alle Seiten nutzen bereits `React.use(params)` oder asynchrone Resolution; Typkonformität wird beim `npm run build` sichergestellt |
| **Sitzungs-Verlust bei Admin-PIN** | Admin muss PIN nach Browser-Neustart erneut eingeben | 7-Tage-Cookie `f1_admin_token` mit `SameSite=Lax` und `HttpOnly` für nahtlose Bedienung |
| **Screenshot OCR-Fehler (F1 25)** | Abweichende Fahrernamen im Screenshot (z.B. Gamertag vs. Klarname) | MCP-Tool implementiert Normalisierung und Fuzzy-Matching auf die 4 bekannten menschlichen Fahrer |

---

## 6. Test- & Verifizierungsstrategie

1. **Automatisierte Builds & Tests:**
   - `npm run test` (Vitest): Verifikation aller Scoring-Funktionen und Bonus-Kalkulationen.
   - `npm run build`: Kompilierungs- und Lint-Prüfung ohne TypeScript-Warnungen.
2. **Datenbank-Konsistenz-Prüfung:**
   - Ausführen von `scripts/seed_season_3.mjs` und Abfrage der Tabellen:
     * `SELECT count(*) FROM race_results WHERE race_id IN (...)` = 10 Einträge.
     * Punktestand-Verifikation: kaydn87 (69), Markus Lanz (58), Dox23y5 (34), Richard David Precht (0).
3. **Manuelle End-to-End-Prüfung im Browser:**
   - **Öffentlicher Modus:** Aufruf von `http://localhost:3000/dashboard` in einem privaten/inkognito Fenster:
     * Dashboard lädt sofort ohne Login-Aufforderung.
     * "Season 3" ist sichtbar und ausgewählt.
     * Meisterschaftsverlauf-Graph stellt alle 3 Rennen dar.
     * Telemetrie- und Rennanalyse-Seiten lassen sich uneingeschränkt öffnen.
   - **Admin-Passcode:**
     * Aufruf von `http://localhost:3000/admin`.
     * Falscheingabe ('111111') ➔ Fehlermeldung.
     * Eingabe von '009981' ➔ Freischaltung des Admin-Dashboards.
     * Bearbeitung von Rennen und Speichern von Ergebnissen erfolgreich.
4. **MCP-Server Verifikation:**
   - Ausführen des MCP-Tools `f1_get_standings` über Stdio:
     * Korrekte Rückgabe des JSON-Objekts mit den 4 Fahrern und Punkteständen.

---

*Dieses Dokument dient als verbindliche Grundlage für die Umsetzung der genannten Anforderungen.*
