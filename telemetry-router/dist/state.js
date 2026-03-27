"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
const incidentManager_1 = require("./incidentManager");
const payloadMapper_1 = require("./payloadMapper");
/**
 * Zentrale Verwaltung des Zustands einer laufenden F1-Telemetrie-Session.
 * Folgt dem Single Responsibility Principle: Delegiert spezialisierte Aufgaben an Unter-Komponenten
 * wie den IncidentManager (Vorfälle) und PayloadMapper (Daten-Transformation).
 */
class SessionState {
    /** Typ der aktuellen Session (z.B. "Race", "Qualifying 1") */
    sessionType = 'Unknown';
    /** Interne Track-ID vom Spiel */
    trackId = -1;
    /** Klarname der Rennstrecke */
    trackName = 'Unknown';
    /** Länge der Rennstrecke in Metern */
    trackLength = 0;
    /** Ob aktive Pakete empfangen werden */
    isActive = false;
    /** Ob das Session-Ende Ereignis empfangen wurde */
    isSessionEnded = false;
    /** Aktuelle FIA-Flaggen auf der Strecke (0=Keine, 1=Grün, 2=Blau, 3=Gelb) */
    trackFlags = 0;
    /** Gesamtzahl der verarbeiteten Pakete in dieser Session */
    packetCount = 0;
    /** Zeitstempel des zuletzt empfangenen Pakets */
    lastPacketTime = 0;
    /** Rohe Session-Daten vom Parser */
    sessionData;
    /** Endergebnis der Session (nur nach Rennende verfügbar) */
    finalClassification = [];
    // Interner Speicher für Fahrerdaten und Hilfsklassen
    players = new Map();
    incidentManager = new incidentManager_1.IncidentManager();
    lapPositions = [];
    /**
     * Erstellt einen neuen PlayerState oder gibt den existierenden für einen Fahrzeug-Index zurück.
     * Sorgt für eine konsistente Initialisierung neuer Fahrer-Objekte.
     *
     * @param carIdx Index des Fahrzeugs im Paket (0-21).
     */
    getPlayer(carIdx) {
        if (!this.players.has(carIdx)) {
            this.players.set(carIdx, {
                gameName: `Unknown_${carIdx}`,
                position: 0,
                lapDistance: 0,
                fastestLapMs: null,
                topSpeedKmh: 0,
                isHuman: false,
                startPosition: 0,
                teamId: 0,
                pitStops: 0,
                warnings: 0,
                penaltiesTime: 0,
                laps: [],
                currentLapNum: 0,
                currentLapSamples: [],
                bestLapSamples: []
            });
        }
        return this.players.get(carIdx);
    }
    /** Erhöht den globalen Paketzähler und aktualisiert den letzten Zeitstempel. */
    incrementPackets() {
        this.packetCount++;
        this.lastPacketTime = Date.now();
    }
    /**
     * Aktualisiert Session-Metadaten (Strecke, Typ, Länge).
     * @param data Gemappte Session-Daten vom Parser.
     */
    updateSession(data) {
        this.incrementPackets();
        this.sessionType = data.sessionTypeMapped;
        this.trackId = data.trackId;
        this.trackName = data.trackName;
        this.trackLength = data.trackLength;
        this.sessionData = data;
        this.isActive = true;
    }
    /**
     * Verarbeitet Event-Pakete wie Strafen, Kollisionen oder technische Defekte.
     * Delegiert die Protokollierung an den IncidentManager.
     *
     * @param event Das geparste Event-Daten Paket.
     */
    handleEvent(event) {
        const car = event.vehicleIdx !== undefined ? this.getPlayer(event.vehicleIdx) : null;
        switch (event.eventStringCode) {
            case 'PENA': // Strafe erhalten
                this.incidentManager.addIncident({
                    type: 'PENALTY',
                    details: `Strafe für ${car?.gameName || 'Auto ' + event.vehicleIdx}: ${event.time}s`,
                    vehicleIdx: event.vehicleIdx,
                    lapNum: event.lapNum
                });
                break;
            case 'COLL': // Kollision zwischen zwei Fahrzeugen
                const v1 = this.getPlayer(event.vehicle1Idx || 0);
                const v2 = this.getPlayer(event.vehicle2Idx || 0);
                this.incidentManager.addIncident({
                    type: 'COLLISION',
                    details: `Kollision zwischen ${v1.gameName} und ${v2.gameName}`,
                    vehicleIdx: event.vehicle1Idx,
                    otherVehicleIdx: event.vehicle2Idx
                });
                break;
            case 'RTMT': // Fahrzeug scheidet aus (DNF)
                const reasonMap = {
                    0: 'Ungültig', 1: 'Aufgegeben', 2: 'Beendet', 3: 'Totalschaden',
                    4: 'Inaktiv', 5: 'Zu wenig Runden', 6: 'Disqualifiziert',
                    7: 'Rote Flagge', 8: 'Motorschaden', 9: 'Übersprungen', 10: 'Simuliert'
                };
                const reason = event.retirementReason !== undefined ? (reasonMap[event.retirementReason] || 'Unbekannt') : 'Retired';
                this.incidentManager.addIncident({
                    type: 'RETIREMENT',
                    details: `Ausscheiden von ${car?.gameName || 'Auto ' + event.vehicleIdx}: ${reason}`,
                    vehicleIdx: event.vehicleIdx,
                    lapNum: event.lapNum
                });
                break;
        }
    }
    /**
     * Registriert ein Safety-Car Ereignis.
     * @param safetyCarType Typ des SC (1=Full, 2=VSC, 3=Medical).
     * @param eventType Status (0=Deployed, 1=Returning, 2=Returned, 3=Resume).
     */
    addSafetyCarEvent(safetyCarType, eventType) {
        let currentLap = 0;
        // Bestimmung der aktuellen führenden Runde für das Log
        for (const [, p] of this.players) {
            if (p.currentLapNum > 0) {
                currentLap = p.currentLapNum;
                break;
            }
        }
        this.incidentManager.addSafetyCarEvent(safetyCarType, eventType, currentLap);
    }
    /**
     * Aktualisiert Rundendaten (Position, Distanz, Warnungen)
     * und erkennt den Abschluss einer Runde.
     *
     * @param carIdx Fahrzeug-Index.
     * @param data Lap-Daten Paket.
     */
    updateLapData(carIdx, data) {
        const p = this.getPlayer(carIdx);
        p.position = data.carPosition;
        p.lapDistance = data.lapDistance;
        // Startposition nur einmalig beim ersten gültigen Paket erfassen
        if (p.startPosition === 0 && data.gridPosition > 0) {
            p.startPosition = data.gridPosition;
        }
        p.pitStops = data.numPitStops;
        p.warnings = data.totalWarnings + data.cornerCuttingWarnings;
        p.penaltiesTime = data.penalties;
        // Rundenübergang: Aktuelle Runde im Paket ist höher als im internen Speicher
        if (data.currentLapNum > p.currentLapNum && p.currentLapNum > 0) {
            this.handleLapCompleted(carIdx, p, data);
        }
        // Telemetrie-Samples aufzeichnen (nur für menschliche Fahrer)
        if (p.isHuman && data.currentLapNum > 0) {
            this.maybeRecordSample(p, data);
        }
        p.currentLapNum = data.currentLapNum;
        p.lapData = data;
    }
    /**
     * Schließt eine Runde ab: Berechnet Sektorzeiten, prüft Bestzeiten
     * und archiviert die Runde im Fahrer-Profil.
     */
    handleLapCompleted(carIdx, p, data) {
        // Archivierung der Position am Ende der Runde
        if (p.position > 0) {
            this.lapPositions.push({ carIndex: carIdx, lapNumber: p.currentLapNum, position: p.position });
        }
        if (p.isHuman && data.lastLapTimeInMS > 0) {
            // Berechnung der Sektorzeiten aus den Paket-Daten
            const s1Ms = data.sector1TimeMinutesPart * 60000 + data.sector1TimeMSPart;
            const s2Ms = data.sector2TimeMinutesPart * 60000 + data.sector2TimeMSPart;
            // Sektor 3 ist die Differenz zur Gesamtzeit
            const s3Ms = s1Ms > 0 && s2Ms > 0 ? Math.max(0, data.lastLapTimeInMS - s1Ms - s2Ms) : 0;
            // Logik für die persönliche Bestzeit (PB)
            if (!data.currentLapInvalid && (p.fastestLapMs === null || data.lastLapTimeInMS < p.fastestLapMs)) {
                p.fastestLapMs = data.lastLapTimeInMS;
                // Sicherung der Telemetrie-Samples für die Analyse der Bestzeit
                p.bestLapSamples = [...p.currentLapSamples];
            }
            p.laps.push({
                lapNumber: p.currentLapNum,
                lapTimeMs: data.lastLapTimeInMS,
                isValid: !data.currentLapInvalid,
                tyreCompound: p.carStatusData?.visualTyreCompound,
                isPitLap: data.pitStatus > 0,
                sector1Ms: s1Ms > 0 ? s1Ms : undefined,
                sector2Ms: s2Ms > 0 ? s2Ms : undefined,
                sector3Ms: s3Ms > 0 ? s3Ms : undefined,
                carDamage: this.createDamageSnapshot(p),
                // Samples nur an die Runde hängen, wenn es eine Bestzeit war (Entlastung der DB)
                samples: (!data.currentLapInvalid && data.lastLapTimeInMS === p.fastestLapMs) ? p.bestLapSamples : undefined
            });
            // Sample-Buffer für die nächste Runde leeren
            p.currentLapSamples = [];
        }
    }
    /**
     * Erstellt einen Momentaufnahme der Fahrzeugschäden für die Runden-Historie.
     */
    createDamageSnapshot(p) {
        if (!p.carDamageData)
            return undefined;
        const d = p.carDamageData;
        return {
            frontLeftWingDamage: d.frontLeftWingDamage,
            frontRightWingDamage: d.frontRightWingDamage,
            rearWingDamage: d.rearWingDamage,
            floorDamage: d.floorDamage,
            diffuserDamage: d.diffuserDamage,
            sidepodDamage: d.sidepodDamage,
            gearBoxDamage: d.gearBoxDamage,
            engineDamage: d.engineDamage,
            engineBlown: d.engineBlown,
            engineSeized: d.engineSeized,
        };
    }
    /**
     * Zeichnet Telemetrie-Sample auf (Speed, Pedale, G-Kräfte) basierend auf der Distanz.
     * Dies wird für die Visualisierung der Fahrer-Liniendifferenz benötigt.
     */
    maybeRecordSample(p, lap) {
        if (!p.telemetryData || !p.motionData)
            return;
        p.currentLapSamples.push({
            d: lap.lapDistance,
            s: p.telemetryData.speedKmh,
            t: p.telemetryData.throttle,
            b: p.telemetryData.brake,
            st: p.telemetryData.steer,
            gLat: p.motionData.gForceLateral,
            gLon: p.motionData.gForceLongitudinal,
            gVert: p.motionData.gForceVertical,
            tSurf: p.telemetryData.tyresSurfaceTemperature,
            tInner: p.telemetryData.tyresInnerTemperature,
            rHeight: p.motionExData ? [p.motionExData.frontAeroHeight, p.motionExData.rearAeroHeight] : [0, 0]
        });
    }
    /**
     * Zählt die Anzahl der aktiven menschlichen Fahrer in der Session.
     */
    getHumanCount() {
        let count = 0;
        for (const [_, p] of this.players) {
            if (p.isHuman && p.gameName && !p.gameName.startsWith('Unknown_')) {
                count++;
            }
        }
        return count;
    }
    /** Setzt das Flag für "Session beendet" (z.B. nach Empfang des SEND-Events). */
    handleSessionEnd() {
        this.isSessionEnded = true;
    }
    /** Dummy-Methode für Interface-Kompatibilität (Wird in F1 2025 seltener genutzt). */
    updateLapPositions(buffer) {
        // Implementierung optional für Paket 15
    }
    /**
     * Synchronisiert die Historie einer Session (vergangene Runden und Sektoren).
     * Wichtig nach einem Verbindungswiederaufbau.
     *
     * @param data Session-History Paket.
     */
    updateSessionHistory(data) {
        this.incrementPackets();
        const p = this.getPlayer(data.carIdx);
        if (!p.isHuman)
            return;
        for (let i = 0; i < data.numLaps; i++) {
            const hLap = data.lapHistoryData[i];
            const lapNumber = i + 1;
            const s1Ms = hLap.sector1TimeMinutes * 60000 + hLap.sector1TimeInMS;
            const s2Ms = hLap.sector2TimeMinutes * 60000 + hLap.sector2TimeInMS;
            const s3Ms = hLap.sector3TimeMinutes * 60000 + hLap.sector3TimeInMS;
            let stateLap = p.laps.find(l => l.lapNumber === lapNumber);
            if (!stateLap) {
                stateLap = {
                    lapNumber: lapNumber,
                    lapTimeMs: hLap.lapTimeInMS,
                    isValid: (hLap.lapValidFlags & 0x01) !== 0,
                    sector1Ms: s1Ms > 0 ? s1Ms : undefined,
                    sector2Ms: s2Ms > 0 ? s2Ms : undefined,
                    sector3Ms: s3Ms > 0 ? s3Ms : undefined
                };
                p.laps.push(stateLap);
            }
            else {
                if (s1Ms > 0)
                    stateLap.sector1Ms = s1Ms;
                if (s2Ms > 0)
                    stateLap.sector2Ms = s2Ms;
                if (s3Ms > 0)
                    stateLap.sector3Ms = s3Ms;
            }
        }
    }
    /**
     * Baut das Payload-Objekt für die Übertragung an das Frontend zusammen.
     * Nutzt den PayloadMapper zur Transformation und leert temporäre Ereignis-Buffer.
     *
     * @returns Komplettes Session-Status Objekt für die API/SSE.
     */
    buildPayloadAndClear() {
        const participantsList = Array.from(this.players.entries())
            .filter(([_, p]) => p.gameName && !p.gameName.startsWith('Unknown_'))
            .map(([_, p]) => payloadMapper_1.PayloadMapper.mapPlayer(_, p));
        const safetyCarEvents = this.incidentManager.fetchAndClearEvents();
        const lapPositions = [...this.lapPositions];
        this.lapPositions = [];
        return {
            sessionType: this.sessionType,
            trackId: this.trackId,
            trackName: this.trackName,
            trackLength: this.trackLength,
            isActive: this.isActive,
            isSessionEnded: this.isSessionEnded,
            sessionData: this.sessionData,
            participants: participantsList,
            safetyCarEvents,
            incidentLog: this.incidentManager.getIncidentLog(),
            trackFlags: this.trackFlags,
            lapPositions,
            finalClassification: this.finalClassification,
        };
    }
    /** Aktualisiert Basis-Informationen zum Teilnehmer. */
    updateParticipant(carIdx, data) {
        const p = this.getPlayer(carIdx);
        if (data.name?.trim().length)
            p.gameName = data.name;
        p.isHuman = data.isHuman;
        p.teamId = data.teamId;
        p.participantData = data;
    }
    /** Aktualisiert Telemetrie (Speed, etc.) und trackt Topspeed. */
    updateTelemetry(carIdx, data) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        if (data.speedKmh > p.topSpeedKmh)
            p.topSpeedKmh = data.speedKmh;
        p.telemetryData = data;
    }
    /** Aktualisiert Status-Daten (Reifen, Mischung, FIA Flaggen). */
    updateCarStatus(carIdx, data) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.carStatusData = data;
    }
    /** Aktualisiert Schadensdaten des Fahrzeugs. */
    updateCarDamage(carIdx, data) {
        this.incrementPackets();
        this.getPlayer(carIdx).carDamageData = data;
    }
    /** Aktualisiert Bewegungsdaten (Position, G-Kräfte). */
    updateMotion(carIdx, data) {
        this.incrementPackets();
        this.getPlayer(carIdx).motionData = data;
    }
    /** Aktualisiert erweiterte Bewegungsdaten (Aero-Höhe etc.). */
    updateMotionEx(carIdx, data) {
        this.incrementPackets();
        this.getPlayer(carIdx).motionExData = data;
    }
    /** Aktualisiert verfügbare Reifensätze. */
    updateTyreSets(carIdx, tyreSets) {
        this.incrementPackets();
        this.getPlayer(carIdx).tyreSets = tyreSets;
    }
    /** Speichert das finale Klassement am Ende des Rennens/Qualifyings. */
    updateFinalClassification(data) {
        this.incrementPackets();
        this.finalClassification = data.classificationData;
        this.isSessionEnded = true;
    }
    /** Gibt eine Zusammenfassung des Session-Status für das Terminal-Dashboard zurück. */
    getDashboardState() {
        return {
            sessionId: 'aktuell',
            trackName: this.trackName,
            sessionType: this.sessionType,
            isActive: this.isActive,
            packetCount: this.packetCount,
            lastPacketTime: this.lastPacketTime
        };
    }
}
exports.SessionState = SessionState;
