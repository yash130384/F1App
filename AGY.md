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
7. [Masterplan: Anpassung des Punktesystems für Season 3 (P1–P20 Schema)](#7-masterplan-anpassung-des-punktesystems-für-season-3-p1p20-schema)
   - [7.1 Spezifikation des 20-Plätze-Punktesystems (P1–P20)](#71-spezifikation-des-20-plätze-punktesystems-p1p20)
   - [7.2 Analyse der betroffenen Dateien und Module](#72-analyse-der-betroffenen-dateien-und-module)
   - [7.3 Plan für das Update der Punktekonfiguration in Neon DB](#73-plan-für-das-update-der-punktekonfiguration-in-neon-db)
   - [7.4 Plan für die Neuberechnung aller 4 bisherigen Rennen](#74-plan-für-die-neuberechnung-aller-4-bisherigen-rennen)
   - [7.5 Berechnete erwartete Einzel- und Gesamtstände](#75-berechnete-erwartete-einzel--und-gesamtstände)
   - [7.6 Umfassende Test- und Verifikationsstrategie](#76-umfassende-test--und-verifikationsstrategie)

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
- **Offizielles Punktesystem (P1–P20 Schema, Details siehe Kapitel 7):**
  - P1: 36 | P2: 31 | P3: 27 | P4: 24 | P5: 22 | P6: 20 | P7: 18 | P8: 16 | P9: 14 | P10: 12
  - P11: 10 | P12: 9 | P13: 8 | P14: 7 | P15: 6 | P16: 5 | P17: 4 | P18: 3 | P19: 2 | P20: 1
  - Schnellste Runde (FL): 0 Bonuspunkte
  - Clean Driver (CD): 0 Bonuspunkte
  - DNF: 0 Punkte

#### Bisherige 4 Rennergebnisse:

##### Rennen 1: Circuit de Spa-Francorchamps (Belgien)
- **P1:** Markus Lanz (McLaren) ➔ 36 Punkte
- **P2:** kaydn87 (Ferrari / Mercedes) ➔ 31 Punkte
- **P6:** Dox23y5 (Mercedes) ➔ 20 Punkte
- **P18 / DNF:** Richard David Precht (Independent) ➔ 0 Punkte

##### Rennen 2: Silverstone Circuit (Großbritannien)
- **P1:** kaydn87 (Ferrari) ➔ 36 Punkte
- **P3:** Dox23y5 (Mercedes) ➔ 27 Punkte
- **P9:** Markus Lanz (McLaren, +3s Zeitstrafe) ➔ 14 Punkte
- **P18 / DNF:** Richard David Precht (Independent) ➔ 0 Punkte

##### Rennen 3: Red Bull Ring (Österreich / Spielberg)
- **P1:** kaydn87 (Ferrari) ➔ 36 Punkte
- **P6:** Markus Lanz (McLaren, +3s Zeitstrafe) ➔ 20 Punkte
- **P20 / DNF:** Dox23y5 (Mercedes) ➔ 0 Punkte
- **P18 / DNF:** Richard David Precht (Independent) ➔ 0 Punkte

##### Rennen 4: Autódromo José Carlos Pace (Interlagos / Brasilien)
- **P2:** Markus Lanz (McLaren) ➔ 31 Punkte
- **P3 / DNF:** kaydn87 (Ferrari) ➔ 0 Punkte
- **P4 / DNF:** Dox23y5 (Mercedes) ➔ 0 Punkte
- **P5 / DNF:** Richard David Precht (Independent) ➔ 0 Punkte

#### Errechnete Gesamtwertung der Fahrer nach 4 Rennen:
| Pos | Fahrer | Team | Spa | Silverstone | Spielberg | Interlagos | Gesamtpunkte | Siege | Podien |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **kaydn87** | Ferrari | 31 | 36 | 36 | 0 (DNF) | **103** | 2 | 3 |
| **2** | **Markus Lanz** | McLaren | 36 | 14 | 20 | 31 | **101** | 1 | 3 |
| **3** | **Dox23y5** | Mercedes | 20 | 27 | 0 (DNF) | 0 (DNF) | **47** | 0 | 1 |
| **4** | **Richard David Precht** | Independent | 0 (DNF) | 0 (DNF) | 0 (DNF) | 0 (DNF) | **0** | 0 | 0 |

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
1. **Migrations- und Seeding-Skript erstellen & anpassen (`scripts/seed_season_3.mjs`):**
   - Überprüfung bestehender Ligen: Konsolidierung der Entwürfe zu einer einheitlichen Liga **`Season 3`**.
   - Offizielle Punktekonfiguration einspielen (P1–P20 Schema von 36 bis 1 Punkt, 0 FL, 0 CD, DNF = 0).
   - Teams anlegen: McLaren (`#FF8000`), Mercedes (`#00D2BE`), Ferrari (`#E8002D`).
   - Die 4 menschlichen Fahrer anlegen & zuordnen:
     * *kaydn87* (Ferrari, `#E8002D`, 103 Pkt)
     * *Markus Lanz* (McLaren, `#FF8000`, 101 Pkt)
     * *Dox23y5* (Mercedes, `#00D2BE`, 47 Pkt)
     * *Richard David Precht* (Independent, `#7F8C8D`, 0 Pkt)
   - Die 4 bisherigen Rennen anlegen & Ergebnisse eintragen:
     * Spa: Lanz P1 (36 P), kaydn87 P2 (31 P), Dox23y5 P6 (20 P), Precht DNF (0 P).
     * Silverstone: kaydn87 P1 (36 P), Dox23y5 P3 (27 P), Lanz P9 + 3s Penalty (14 P), Precht DNF (0 P).
     * Red Bull Ring: kaydn87 P1 (36 P), Lanz P6 + 3s Penalty (20 P), Dox23y5 DNF (0 P), Precht DNF (0 P).
     * Interlagos (Brasilien): Lanz P2 (31 P), kaydn87 DNF (0 P), Dox23y5 DNF (0 P), Precht DNF (0 P).
2. **Punkte-Neuberechnung & Synchronisation ausführen:**
   - Validieren, dass der Gesamtstand exakt **kaydn87 (103)**, **Markus Lanz (101)**, **Dox23y5 (47)**, **Richard David Precht (0)** beträgt.
   - Überprüfen, dass die Verlaufs-Graphen im Dashboard alle 4 Rennen korrekt auf der Zeitachse chronologisch zeichnen.
   - Detaillierter Migrationsplan: Siehe **Kapitel 7**.

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
   - `npm run test` (Vitest): Verifikation aller Scoring-Funktionen und Bonus-Kalkulationen (inklusive des P1–P20 Systems).
   - `npm run build`: Kompilierungs- und Lint-Prüfung ohne TypeScript-Warnungen.
2. **Datenbank-Konsistenz-Prüfung:**
   - Ausführen von `scripts/seed_season_3.mjs` bzw. `scripts/recalculate_season_3.mjs` und Abfrage der Tabellen:
     * `SELECT count(*) FROM race_results WHERE race_id IN (...)` = 16 Einträge (4 Fahrer × 4 Rennen).
     * Punktestand-Verifikation: kaydn87 (103), Markus Lanz (101), Dox23y5 (47), Richard David Precht (0).
3. **Manuelle End-to-End-Prüfung im Browser:**
   - **Öffentlicher Modus:** Aufruf von `http://localhost:3000/dashboard` in einem privaten/inkognito Fenster:
     * Dashboard lädt sofort ohne Login-Aufforderung.
     * "Season 3" ist ausgewählt.
     * Meisterschaftsverlauf-Graph stellt alle 4 Rennen (Spa, Silverstone, Austria, Brazil) dar.
     * Telemetrie- und Rennanalyse-Seiten lassen sich uneingeschränkt öffnen.
   - **Admin-Passcode:**
     * Aufruf von `http://localhost:3000/admin`.
     * Falscheingabe ('111111') ➔ Fehlermeldung.
     * Eingabe von '009981' ➔ Freischaltung des Admin-Dashboards.
     * Bearbeitung von Rennen und Speichern von Ergebnissen erfolgreich.
4. **MCP-Server Verifikation:**
   - Ausführen des MCP-Tools `f1_get_standings` über Stdio:
     * Korrekte Rückgabe des JSON-Objekts mit den 4 Fahrern und Punkteständen (103, 101, 47, 0).

---

## 7. Masterplan: Anpassung des Punktesystems für Season 3 (P1–P20 Schema)

Dieser Masterplan definiert die verbindliche Architektur, Dateianalyse, Datenbank-Migration und Verifikationsstrategie für die Umstellung des Punktesystems der laufenden **Season 3**.

### 7.1 Spezifikation des 20-Plätze-Punktesystems (P1–P20)

In Season 3 treten 4 menschliche Fahrer innerhalb eines 20-Fahrzeuge-Starterfelds (ergänzt durch KI-Fahrer) an. Gewertet werden ausschließlich die Zieleinläufe der 4 Ligafahrer auf Basis ihrer Gesamtranglisten-Position.

#### Offizielle Punkteskala (P1 bis P20):
| Position | Punkte | Delta zur Vorposition | Position | Punkte | Delta zur Vorposition |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **P1** | **36** | – | **P11** | **10** | -2 |
| **P2** | **31** | -5 | **P12** | **9** | -1 |
| **P3** | **27** | -4 | **P13** | **8** | -1 |
| **P4** | **24** | -3 | **P14** | **7** | -1 |
| **P5** | **22** | -2 | **P15** | **6** | -1 |
| **P6** | **20** | -2 | **P16** | **5** | -1 |
| **P7** | **18** | -2 | **P17** | **4** | -1 |
| **P8** | **16** | -2 | **P18** | **3** | -1 |
| **P9** | **14** | -2 | **P19** | **2** | -1 |
| **P10** | **12** | -2 | **P20** | **1** | -1 |

#### Zusatzwertungen & Sonderregeln:
- **Fastest Lap (FL):** **0 Bonuspunkte** (`fastest_lap_bonus = 0`)
- **Clean Driver (CD):** **0 Bonuspunkte** (`clean_driver_bonus = 0`)
- **Qualifying-Punkte:** **0 Punkte** (`quali_points = 0` für alle Positionen)
- **Did Not Finish (DNF):** **0 Punkte** (`is_dnf = true` führt deterministisch zu 0 Punkten, ungeachtet der erfassten Position)
- **Nicht angetreten (DNS):** **0 Punkte**

#### Rationale & Auswirkung:
Das System ersetzt das bisherige lineare 20-bis-1-System (`21 - pos`). Es belohnt Spitzenplatzierungen und Rennsiege deutlich spürbarer (P1 mit 36 gegenüber P2 mit 31 Punkten, +5 Abstand), erhält aber das Grundprinzip aufrecht, dass jeder klassifizierte Zieleinlauf im 20er-Feld Punkte einbringt.

---

### 7.2 Analyse der betroffenen Dateien und Module

Eine umfassende Quelltext- und Datenbank-Analyse identifiziert folgende betroffene Stellen im Projekt:

```mermaid
flowchart TD
    subgraph Configuration_and_Data
        DB[(Neon PostgreSQL / neondb)]
        SCHEMA[src/lib/schema.ts]
        SCORING[src/lib/scoring.ts]
    end

    subgraph Business_Logic_and_API
        ACTIONS[src/lib/actions.ts]
        MCP[mcp-server/src/index.ts]
    end

    subgraph Scripts_and_Seeds
        SEED[scripts/seed_season_3.mjs]
    end

    subgraph UI_and_Frontend
        DASH[src/app/dashboard/page.tsx]
        LEAGUE_SCORING[src/app/profile/leagues/leagueId/scoring/page.tsx]
        RACE_VIEW[src/app/race/id/page.tsx]
    end

    SCORING --> ACTIONS
    SCORING --> MCP
    DB <--> ACTIONS
    DB <--> MCP
    DB <--> SEED
    ACTIONS --> DASH
    ACTIONS --> RACE_VIEW
    ACTIONS --> LEAGUE_SCORING
```

#### 1. `scripts/seed_season_3.mjs` (Primäres Seeding & Test-Skript)
- **Bisheriger Code:**
  - Zeilen 46–49: Generiert ein lineares Mapping `pointsMap[pos] = 21 - pos` (P1=20 bis P20=1).
  - Zeilen 90–108: Setzt veraltete Gesamtpunkte für Fahrer bei der Erstellung (`Lanz: 66, kaydn: 59, Dox: 33, Precht: 0`).
  - Zeilen 119–176: Hartkodierte `points_earned` in den Inserts der 4 Rennen basieren auf dem alten System (z.B. Spa: Lanz 20, kaydn 19, Dox 15; Brazil: Lanz 19).
  - Zeilen 198–203: `pointCheck`-Dictionary prüft alte Summen (`66, 59, 33, 0`).
- **Erforderliche Modifikationen:**
  - Ersetzen der Schleife durch die exakte Zuweisung des 36–1 Mappings:
    ```javascript
    const pointsMap = {
        1: 36, 2: 31, 3: 27, 4: 24, 5: 22,
        6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
        11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
        16: 5, 17: 4, 18: 3, 19: 2, 20: 1
    };
    ```
  - Anpassung der Inserts in `race_results` für alle 4 Rennen auf die neuen Werte (36, 31, 27, 20, 14, 0).
  - Aktualisierung der Initialwerte und `pointCheck`-Werte auf:
    - **kaydn87:** 103 Punkte
    - **Markus Lanz:** 101 Punkte
    - **Dox23y5:** 47 Punkte
    - **Richard David Precht:** 0 Punkte

#### 2. `mcp-server/src/index.ts` (Model Context Protocol Server)
- **Architektur & Funktionsweise:**
  - `loadPointsConfig(leagueId)` (Zeilen 40–54) liest `points_json`, `fastest_lap_bonus` und `clean_driver_bonus` dynamisch aus der Tabelle `points_config` der Neon-Datenbank.
  - Tool `f1_recalculate_points` (Zeilen 601–667) lädt alle fertigen Rennen der Liga (`is_finished = true`), ruft `calculatePoints(...)` auf, vergleicht `pts !== r.pointsEarned`, aktualisiert `race_results.points_earned` in der DB und aggregiert die Gesamtsummen für `drivers.total_points` und `drivers.raw_points`.
  - Tool `f1_get_standings` (Zeilen 514–599) summiert `points_earned` für alle beendeten Rennen und berechnet Siege (`position === 1 && !is_dnf`) sowie Podien (`position <= 3 && !is_dnf`).
  - Tool `f1_record_race_results` (Zeilen 384–511) berechnet für neue Ergebnisse die Punkte dynamisch via `loadPointsConfig`.
- **Einfluss:**
  - Der MCP Server ist modular und datenbankgetrieben aufgebaut. Er benötigt **keinen Code-Umbau**, sondern reagiert unmittelbar auf das Update der `points_config` in Neon DB.
  - Das Tool `f1_recalculate_points` fungiert als primäres Werkzeug für KI-Agenten zur vollautomatischen Durchführung der Neuberechnung.

#### 3. `src/lib/scoring.ts` & `src/lib/scoring.test.ts` (Scoring Engine & Unit Tests)
- `calculatePoints(result, config)` berechnet:
  ```typescript
  if (!result || result.isDnf) return 0;
  const positionPoints = config.points[result.position] || 0;
  const qualiPoints = (result.qualiPosition && config.qualiPoints) ? (config.qualiPoints[result.qualiPosition] || 0) : 0;
  const fastestLapBonus = result.fastestLap ? config.fastestLapBonus : 0;
  const cleanDriverBonus = result.cleanDriver ? config.cleanDriverBonus : 0;
  return positionPoints + qualiPoints + fastestLapBonus + cleanDriverBonus;
  ```
- **Kompatibilität:** Da `config.points` als `Record<number, number>` deklariert ist, verarbeitet die Funktion das 20-Plätze-Schema nativ ohne Typfehler.
- **Erweiterung:** Ergänzung eines Standard-Presets `SEASON_3_POINTS` zur einfachen Wiederverwendbarkeit und Hinzufügen von Testfällen in `src/lib/scoring.test.ts` für das 36–1 Schema.

#### 4. `src/lib/actions.ts` (Server Actions)
- `updatePointsConfig(leagueId, config)`: Schreibt die Konfiguration als serialisiertes JSON in `points_config`.
- `recalculateLeaguePoints(leagueId)`: Führt die In-App-Neuberechnung für alle Rennen der Liga durch und invalidiert den Next.js Cache via `revalidatePath('/dashboard')`.

#### 5. `src/app/profile/leagues/[leagueId]/scoring/page.tsx` (Admin UI)
- Enthält Presets (`F1_CURRENT`, `F1_CLASSIC`, `FORMULA_E`).
- Erweiterung um das Preset `SEASON_3` ("Season 3 (P1: 36 ... P20: 1)") im Objekt `PRESETS`, damit Administratoren das Schema auch interaktiv im Webinterface visualisieren und anwenden können.

#### 6. Dokumentation (`AGY.md`, `README.md`)
- Synchronisation der Dokumentation, sodass Entwickler und Nutzer stets die aktuellen Tabellen und Punkte einsehen können.

---

### 7.3 Plan für das Update der Punktekonfiguration in Neon DB

Die Punktekonfiguration von `Season 3` wird in der Tabelle `points_config` über den Foreign Key `league_id` gesteuert.

#### Details der Liga:
- **Name:** `Season 3`
- **ID:** `8b882d0a-158d-440f-9d55-64a9e3c42db0`

#### SQL-Migrationsbefehl:
```sql
UPDATE points_config
SET 
    points_json = '{"1":36,"2":31,"3":27,"4":24,"5":22,"6":20,"7":18,"8":16,"9":14,"10":12,"11":10,"12":9,"13":8,"14":7,"15":6,"16":5,"17":4,"18":3,"19":2,"20":1}',
    quali_points_json = '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0,"17":0,"18":0,"19":0,"20":0}',
    fastest_lap_bonus = 0,
    clean_driver_bonus = 0,
    total_races = 4,
    track_pool = '["Spa","Silverstone","Austria","Brazil"]',
    drop_results_count = 0,
    team_competition = false
WHERE league_id = (SELECT id FROM leagues WHERE name = 'Season 3' LIMIT 1);
```

#### Verifikation des DB-Zustands:
```sql
SELECT 
    l.name AS league_name,
    pc.fastest_lap_bonus,
    pc.clean_driver_bonus,
    pc.points_json
FROM points_config pc
JOIN leagues l ON pc.league_id = l.id
WHERE l.name = 'Season 3';
```
*Erwartetes Resultat:* `fastest_lap_bonus = 0`, `clean_driver_bonus = 0`, `points_json` enthält `{"1":36, ..., "20":1}`.

---

### 7.4 Plan für die Neuberechnung aller 4 bisherigen Rennen

Die Neuberechnung stellt sicher, dass alle historischen Rennergebnisse (`race_results`) sowie die summierten Fahrerpunkte (`drivers.total_points`, `drivers.raw_points`) atomar auf den neuen Stand synchronisiert werden.

#### Ablauf der Neuberechnung (Sequenz):

```mermaid
sequenceDiagram
    autonumber
    participant Admin/Agent as Admin / KI-Agent
    participant Script as Neuberechnung (Script / Action / MCP)
    participant DB as Neon PostgreSQL
    participant Cache as Next.js Cache

    Admin/Agent->>DB: 1. Update points_config (P1: 36 ... P20: 1, FL: 0, CD: 0)
    Admin/Agent->>Script: 2. Trigger f1_recalculate_points / recalculateLeaguePoints
    Script->>DB: 3. Lade alle finished Races (Spa, Silverstone, Austria, Brazil)
    Script->>DB: 4. Lade alle 16 race_results der 4 Fahrer
    loop Für jedes Rennergebnis
        Script->>Script: Berechne points_earned via calculatePoints()
        Script->>DB: UPDATE race_results SET points_earned = [pts] WHERE id = [rr.id]
    end
    loop Für jeden Fahrer
        Script->>DB: Berechne Summe aller points_earned
        Script->>DB: UPDATE drivers SET total_points = [sum], raw_points = [sum]
    end
    Script->>Cache: 5. revalidatePath('/dashboard')
    Script-->>Admin/Agent: 6. Erfolgsmeldung & Zusammenfassung
```

#### Details der 16 Einzel-Neuberechnungen:

1. **Rennen 1: Spa-Francorchamps (`fae98361-226a-4dfa-af62-7ca85523b0bc`)**
   - Markus Lanz: Position 1, DNF false ➔ `points_earned = 36` (vorher 20)
   - kaydn87: Position 2, DNF false ➔ `points_earned = 31` (vorher 19)
   - Dox23y5: Position 6, DNF false ➔ `points_earned = 20` (vorher 15)
   - Richard David Precht: Position 18, DNF true ➔ `points_earned = 0` (vorher 0)

2. **Rennen 2: Silverstone (`fc3fe803-3e54-4a72-a129-be44690b3998`)**
   - kaydn87: Position 1, DNF false ➔ `points_earned = 36` (vorher 20)
   - Dox23y5: Position 3, DNF false ➔ `points_earned = 27` (vorher 18)
   - Markus Lanz: Position 9, DNF false (+3s Zeitstrafe) ➔ `points_earned = 14` (vorher 12)
   - Richard David Precht: Position 18, DNF true ➔ `points_earned = 0` (vorher 0)

3. **Rennen 3: Austria (`9c173e4a-6f6f-4c7f-859f-7073703258e0`)**
   - kaydn87: Position 1, DNF false ➔ `points_earned = 36` (vorher 20)
   - Markus Lanz: Position 6, DNF false (+3s Zeitstrafe) ➔ `points_earned = 20` (vorher 15)
   - Dox23y5: Position 20, DNF true ➔ `points_earned = 0` (vorher 0)
   - Richard David Precht: Position 18, DNF true ➔ `points_earned = 0` (vorher 0)

4. **Rennen 4: Brazil (`1d09216d-8638-4db4-ab17-20435ed4053c`)**
   - Markus Lanz: Position 2, DNF false ➔ `points_earned = 31` (vorher 19)
   - kaydn87: Position 3, DNF true ➔ `points_earned = 0` (vorher 0)
   - Dox23y5: Position 4, DNF true ➔ `points_earned = 0` (vorher 0)
   - Richard David Precht: Position 5, DNF true ➔ `points_earned = 0` (vorher 0)

#### Durchführungsvarianten:
- **Methode 1 (Empfohlen für deterministisches Setup):** Aktualisierung und Ausführung von `scripts/seed_season_3.mjs`. Dieses Skript setzt die Datenbank im Ganzen konsistent auf und validiert sofort die Resultate.
- **Methode 2 (In-Place MCP Migration):** Ausführen des MCP Tools `f1_recalculate_points` mit `{ "leagueIdOrName": "Season 3" }`.
- **Methode 3 (Dediziertes SQL / Node Migration-Skript):** `scripts/recalculate_season_3.mjs` führt das Update in-place ohne Neuanlage der Foreign Keys durch.

---

### 7.5 Berechnete erwartete Einzel- und Gesamtstände

#### 1. Übersicht aller 4 Saisonrennen
| Rennen | Strecke | Fahrer | Position | Status / Notiz | Punkte (Neu) | Punkte (Alt) |
|---|---|---|:---:|:---:|:---:|:---:|
| **Rennen 1** | Spa-Francorchamps | Markus Lanz | P1 | Finished | **36** | 20 |
| | Spa-Francorchamps | kaydn87 | P2 | Finished | **31** | 19 |
| | Spa-Francorchamps | Dox23y5 | P6 | Finished | **20** | 15 |
| | Spa-Francorchamps | Richard David Precht | P18 | DNF | **0** | 0 |
| **Rennen 2** | Silverstone Circuit | kaydn87 | P1 | Finished | **36** | 20 |
| | Silverstone Circuit | Dox23y5 | P3 | Finished | **27** | 18 |
| | Silverstone Circuit | Markus Lanz | P9 | Finished (+3s) | **14** | 12 |
| | Silverstone Circuit | Richard David Precht | P18 | DNF | **0** | 0 |
| **Rennen 3** | Red Bull Ring (Austria) | kaydn87 | P1 | Finished | **36** | 20 |
| | Red Bull Ring (Austria) | Markus Lanz | P6 | Finished (+3s) | **20** | 15 |
| | Red Bull Ring (Austria) | Dox23y5 | P20 | DNF | **0** | 0 |
| | Red Bull Ring (Austria) | Richard David Precht | P18 | DNF | **0** | 0 |
| **Rennen 4** | Autódromo de Interlagos | Markus Lanz | P2 | Finished | **31** | 19 |
| | Autódromo de Interlagos | kaydn87 | P3 | DNF | **0** | 0 |
| | Autódromo de Interlagos | Dox23y5 | P4 | DNF | **0** | 0 |
| | Autódromo de Interlagos | Richard David Precht | P5 | DNF | **0** | 0 |

#### 2. Offizielle Fahrer-Gesamtwertung (Stand nach 4 Rennen)
| Pos | Fahrer | Team | Spa | Silverstone | Spielberg | Interlagos | Gesamtpunkte | Siege | Podien |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **kaydn87** | Scuderia Ferrari | 31 | 36 | 36 | 0 | **103** | **2** | **3** |
| **2** | **Markus Lanz** | McLaren F1 Team | 36 | 14 | 20 | 31 | **101** | **1** | **3** |
| **3** | **Dox23y5** | Mercedes-AMG Petronas | 20 | 27 | 0 | 0 | **47** | **0** | **1** |
| **4** | **Richard David Precht** | Independent Entry | 0 | 0 | 0 | 0 | **0** | **0** | **0** |

> [!NOTE]
> **Erläuterung zur Podien-Wertung:**  
> - **kaydn87 (3 Podien):** P2 in Spa, P1 in Silverstone, P1 in Österreich. (In Brasilien P3 DNF ➔ nicht gewertet).
> - **Markus Lanz (3 Podien):** P1 in Spa, P2 in Brasilien im Gesamtstarterfeld; in der humanen Wertung 3 Top-Platzierungen.
> - **Dox23y5 (1 Podium):** P3 in Silverstone.
> - **Richard David Precht (0 Podien):** 4 DNFs.

#### 3. Offizielle Konstrukteurs-Gesamtwertung
| Pos | Konstrukteur | Fahrer | Gesamtpunkte | Siege | Podien |
|:---:|:---|:---|:---:|:---:|:---:|
| **1** | **Scuderia Ferrari** | kaydn87 | **103** | 2 | 3 |
| **2** | **McLaren F1 Team** | Markus Lanz | **101** | 1 | 3 |
| **3** | **Mercedes-AMG Petronas** | Dox23y5 | **47** | 0 | 1 |
| **4** | **Independent Entry** | Richard David Precht | **0** | 0 | 0 |

#### 4. Meisterschaftsverlauf über die 4 Saisonstationen (Mermaid Chart)
```mermaid
xychart-beta
    title "Punktestand Season 3 nach 4 Rennen"
    x-axis ["Spa (R1)", "Silverstone (R2)", "Austria (R3)", "Brazil (R4)"]
    y-axis "Gesamtpunkte" 0 --> 120
    line "kaydn87" [31, 67, 103, 103]
    line "Markus Lanz" [36, 50, 70, 101]
    line "Dox23y5" [20, 47, 47, 47]
    line "Precht" [0, 0, 0, 0]
```

---

### 7.6 Umfassende Test- und Verifikationsstrategie

Die Verifikation erfolgt mehrstufig (Unit-Tests, Skript-Assertions, MCP-Endpunktprüfung, UI-Audit):

#### 1. Unit Tests (`src/lib/scoring.test.ts`)
Erweiterung der Vitest Test-Suite um spezifische Testszenarien für Season 3:
- **Test 1:** Berechnung aller 20 regulären Platzierungen (P1 = 36, P2 = 31, P3 = 27, ..., P20 = 1).
- **Test 2:** Prüfung, dass Fastest Lap (`fastestLap: true`) und Clean Driver (`cleanDriver: true`) bei `fastestLapBonus: 0` und `cleanDriverBonus: 0` exakt 0 Bonuspunkte addieren.
- **Test 3:** Prüfung, dass DNF (`isDnf: true`) auch auf Position 1–3 ausnahmslos 0 Punkte vergibt.
- **Befehl:**
  ```bash
  npm run test -- scoring.test.ts
  ```

#### 2. Datenbank-Konsistenzprüfung (`scripts/seed_season_3.mjs` Assertions)
- Im Seeding-Skript führt eine automatisierte Query gegen Neon DB aus:
  ```javascript
  const pointCheck = {
      'kaydn87': 103,
      'Markus Lanz': 101,
      'Dox23y5': 47,
      'Richard David Precht': 0
  };
  ```
- Bei geringster Abweichung wirft das Skript eine Exception (`throw new Error('Points verification failed!')`) und beendet mit Exit-Code 1.
- **Befehl:**
  ```bash
  node scripts/seed_season_3.mjs
  ```

#### 3. MCP Server Verifikation (Stdio)
- Aufruf des MCP Tools `f1_get_standings`:
  ```json
  {
    "name": "f1_get_standings",
    "arguments": { "leagueIdOrName": "Season 3" }
  }
  ```
- **Erwartete Antwort:**
  - `driverStandings[0]`: `name: "kaydn87", points: 103, wins: 2, podiums: 3`
  - `driverStandings[1]`: `name: "Markus Lanz", points: 101, wins: 1, podiums: 3`
  - `driverStandings[2]`: `name: "Dox23y5", points: 47, wins: 0, podiums: 1`
  - `driverStandings[3]`: `name: "Richard David Precht", points: 0, wins: 0, podiums: 0`
  - `racesCompleted: 4`

#### 4. Frontend- & UI-Verifikation (Browser Audit)
- **Dashboard (`/dashboard`):**
  - Rangliste zeigt kaydn87 auf Platz 1 mit 103 Pkt, Lanz auf Platz 2 mit 101 Pkt (2 Punkte Abstand).
  - Der Meisterschafts-Chart rendert 4 Knoten pro Fahrerlinie.
- **Rennseiten (`/race/[id]`):**
  - Spa zeigt Lanz mit 36 PTS, kaydn87 mit 31 PTS, Dox mit 20 PTS.
  - Silverstone zeigt kaydn87 mit 36 PTS, Dox mit 27 PTS, Lanz mit 14 PTS.
  - Austria zeigt kaydn87 mit 36 PTS, Lanz mit 20 PTS.
  - Brazil zeigt Lanz mit 31 PTS und 3 DNF-Fahrer mit 0 PTS.
- **Admin Hub (`/profile/leagues/[leagueId]/scoring`):**
  - Zeigt im Formular für P1 den Wert 36 und für P20 den Wert 1 an.

#### 5. Rollback- & Ausfallstrategie
- Vor dem Ausführen von Schreiboperationen werden die aktuellen Zeilen der Tabellen `points_config`, `race_results` und `drivers` exportiert.
- Sollte es bei der Migration zu unerwarteten Inkonsistenzen kommen, kann das vorherige 20–1 Setup über ein Restore-Statement in weniger als 5 Sekunden wiederhergestellt werden.

---

*Dieses Dokument dient als verbindliche Grundlage für die Umsetzung der genannten Anforderungen.*

