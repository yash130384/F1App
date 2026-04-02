import { ParticipantData } from './parsers/participants';
import { LapData } from './parsers/lapData';
import { CarTelemetryData } from './parsers/telemetry';
import { CarDamageData } from './parsers/carDamage';
import { CarStatusData } from './parsers/carStatus';
import { MotionData } from './parsers/motionData';
import { MotionExData } from './parsers/motionEx';
import { PacketSessionHistoryData } from './parsers/sessionHistory';
import { TyreSetData } from './parsers/tyreSets';
import { EventData } from './parsers/eventData';
import { PacketFinalClassificationData, FinalClassificationData } from './parsers/finalClassification';

import { 
    PlayerState, 
    LapEntry, 
    CarDamageSnapshot, 
    LapPositionEntry, 
} from './types';

import { IncidentManager } from './incidentManager';
import { PayloadMapper } from './payloadMapper';
import { TrackIntel } from './trackIntel';

/**
 * Zentrale Verwaltung des Zustands einer laufenden F1-Telemetrie-Session.
 * Folgt dem Single Responsibility Principle: Delegiert spezialisierte Aufgaben an Unter-Komponenten
 * wie den IncidentManager (Vorfälle) und PayloadMapper (Daten-Transformation).
 */
export class SessionState {
    /** Typ der aktuellen Session (z.B. "Race", "Qualifying 1") */
    public sessionType: string = 'Unknown';
    /** Interne Track-ID vom Spiel */
    public trackId: number = -1;
    /** Klarname der Rennstrecke */
    public trackName: string = 'Unknown';
    /** Länge der Rennstrecke in Metern */
    public trackLength: number = 0;
    
    /** Ob aktive Pakete empfangen werden */
    public isActive: boolean = false;
    /** Ob das Session-Ende Ereignis empfangen wurde */
    public isSessionEnded: boolean = false;
    /** Aktuelle FIA-Flaggen auf der Strecke (0=Keine, 1=Grün, 2=Blau, 3=Gelb) */
    public trackFlags: number = 0; 
    
    /** Gesamtzahl der verarbeiteten Pakete in dieser Session */
    public packetCount: number = 0;
    /** Zeitstempel des zuletzt empfangenen Pakets */
    public lastPacketTime: number = 0;
    /** Rohe Session-Daten vom Parser */
    public sessionData?: any;
    /** Endergebnis der Session (nur nach Rennende verfügbar) */
    public finalClassification: FinalClassificationData[] = [];

    // Interner Speicher für Fahrerdaten und Hilfsklassen
    private players: Map<number, PlayerState> = new Map();
    private incidentManager: IncidentManager = new IncidentManager();
    private lapPositions: LapPositionEntry[] = [];
    private trackIntel: TrackIntel = new TrackIntel();

    /**
     * Setzt den Status der Session komplett zurück (z.B. wenn eine neue UID erkannt wurde).
     */
    public reset() {
        this.sessionType = 'Unknown';
        this.trackId = -1;
        this.trackName = 'Unknown';
        this.trackLength = 0;
        this.isActive = false;
        this.isSessionEnded = false;
        this.trackFlags = 0;
        this.packetCount = 0;
        this.lastPacketTime = 0;
        this.sessionData = undefined;
        this.finalClassification = [];
        this.players.clear();
        this.incidentManager = new IncidentManager();
        this.lapPositions = [];
    }

    /**
     * Erstellt einen neuen PlayerState oder gibt den existierenden für einen Fahrzeug-Index zurück.
     * Sorgt für eine konsistente Initialisierung neuer Fahrer-Objekte.
     * 
     * @param carIdx Index des Fahrzeugs im Paket (0-21).
     */
    public getPlayer(carIdx: number): PlayerState {
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
                speedTraps: [],
                currentLapSamples: [],
                bestLapSamples: []
            });
        }
        return this.players.get(carIdx)!;
    }

    /** Erhöht den globalen Paketzähler und aktualisiert den letzten Zeitstempel. */
    private incrementPackets() {
        this.packetCount++;
        this.lastPacketTime = Date.now();
    }

    /**
     * Aktualisiert Session-Metadaten (Strecke, Typ, Länge).
     * @param data Gemappte Session-Daten vom Parser.
     */
    public updateSession(data: any) {
        this.incrementPackets();
        this.sessionType = data.sessionTypeMapped;
        this.trackId = data.trackId;
        this.trackName = data.trackName;
        this.trackLength = data.trackLength;
        this.sessionData = data;
        
        // Track-Intelligenz initialisieren (Kurven-Mapping laden)
        this.trackIntel.loadTrack(this.trackId);
        
        this.isActive = true;
    }

    /**
     * Verarbeitet Event-Pakete wie Strafen, Kollisionen oder technische Defekte.
     * Delegiert die Protokollierung an den IncidentManager.
     * 
     * @param event Das geparste Event-Daten Paket.
     */
    public handleEvent(event: EventData) {
        const car = event.vehicleIdx !== undefined ? this.getPlayer(event.vehicleIdx) : null;
        
        switch(event.eventStringCode) {
            case 'PENA': // Strafe erhalten
                this.incidentManager.addIncident({
                    type: 'PENALTY',
                    details: `Strafe für ${car?.gameName || 'Auto '+event.vehicleIdx}: ${event.time}s`,
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
                const reasonMap: Record<number, string> = {
                    0: 'Ungültig', 1: 'Aufgegeben', 2: 'Beendet', 3: 'Totalschaden',
                    4: 'Inaktiv', 5: 'Zu wenig Runden', 6: 'Disqualifiziert',
                    7: 'Rote Flagge', 8: 'Motorschaden', 9: 'Übersprungen', 10: 'Simuliert'
                };
                const reason = event.retirementReason !== undefined ? (reasonMap[event.retirementReason] || 'Unbekannt') : 'Retired';
                this.incidentManager.addIncident({
                    type: 'RETIREMENT',
                    details: `Ausscheiden von ${car?.gameName || 'Auto '+event.vehicleIdx}: ${reason}`,
                    vehicleIdx: event.vehicleIdx,
                    lapNum: event.lapNum
                });
                break;
            case 'SPTP': // Speed Trap
                if (car) {
                    car.speedTraps.push({
                        speed: event.speed,
                        isOverallFastest: event.isOverallFastestInSession === 1,
                        isDriverFastest: event.isDriverFastestInSession === 1,
                        lapNum: car.currentLapNum,
                        distance: car.lapDistance
                    });
                }
                break;
        }
    }

    /**
     * Registriert ein Safety-Car Ereignis.
     * @param safetyCarType Typ des SC (1=Full, 2=VSC, 3=Medical).
     * @param eventType Status (0=Deployed, 1=Returning, 2=Returned, 3=Resume).
     */
    public addSafetyCarEvent(safetyCarType: number, eventType: number) {
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
    public updateLapData(carIdx: number, data: LapData) {
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
    private handleLapCompleted(carIdx: number, p: PlayerState, data: LapData) {
        // Archivierung der Position am Ende der Runde
        if (p.position > 0) {
            this.lapPositions.push({ carIndex: carIdx, lapNumber: p.currentLapNum, position: p.position });
        }

        if (p.isHuman && data.lastLapTimeInMS > 0) {
            // Berechnung der Sektorzeiten aus den Paket-Daten
            const s1Ms = data.sector1TimeMinutes * 60000 + data.sector1TimeInMS;
            const s2Ms = data.sector2TimeMinutes * 60000 + data.sector2TimeInMS;
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
                pitStopTimerMs: data.pitStopTimerInMS > 0 ? data.pitStopTimerInMS : undefined,
                pitLaneTimeMs: data.pitLaneTimeInLaneInMS > 0 ? data.pitLaneTimeInLaneInMS : undefined,
                // Alle Runden eines Menschen erhalten jetzt Samples, damit der Sender am Ende die Top 2 filtern kann
                samples: [...p.currentLapSamples]
            });

            // Sample-Buffer für die nächste Runde leeren
            p.currentLapSamples = [];
        }
    }

    /**
     * Erstellt einen Momentaufnahme der Fahrzeugschäden für die Runden-Historie.
     */
    private createDamageSnapshot(p: PlayerState): CarDamageSnapshot | undefined {
        if (!p.carDamageData) return undefined;
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
            tyresWear: [...d.tyresWear],
            tyresDamage: [...d.tyresDamage],
            brakesDamage: [...d.brakesDamage],
        };
    }

    /**
     * Zeichnet Telemetrie-Sample auf (Speed, Pedale, G-Kräfte, ERS) basierend auf der Distanz.
     * Dies wird für die Visualisierung der Fahrer-Liniendifferenz benötigt.
     * Filtert auf menschliche Fahrer und fügt Weltkoordinaten nur für die Bestlap hinzu.
     */
    private maybeRecordSample(p: PlayerState, lap: LapData) {
        if (!p.isHuman) return; // Nur menschliche Spieler aufzeichnen
        if (!p.telemetryData || !p.motionData) return;

        // 60Hz Modus: Wir zeichnen jedes empfangene Paket auf (User-Anforderung)


        const t = p.telemetryData;
        const m = p.motionData;
        const s = p.carStatusData;

        // Wir prüfen, ob dies die aktuelle Bestrunde ist, um Weltkoordinaten anzuhängen
        const isBestLapCandidate = p.fastestLapMs === null || (lap.lastLapTimeInMS > 0 && lap.lastLapTimeInMS <= p.fastestLapMs);

        p.currentLapSamples.push({
            d: lap.lapDistance,
            s: t.speed,
            t: t.throttle,
            b: t.brake,
            st: t.steer,
            g: t.gear,
            rpm: t.engineRPM,
            ers: s?.ersStoreEnergy || 0,
            em: s?.ersDeployMode || 0,
            drs: t.drs,
            gLat: m.gForceLateral,
            gLon: m.gForceLongitudinal,
            gVert: m.gForceVertical,
            tSurf: [...t.tyresSurfaceTemperature],
            tInner: [...t.tyresInnerTemperature],
            rHeight: p.motionExData ? [p.motionExData.frontAeroHeight, p.motionExData.rearAeroHeight] : [0, 0],
            // Weltkoordinaten für Race-Line Analyse (spart Speicher, wenn wir es immer machen, daher nur in bestLapSamples via Kopie später oder hier)
            // Entwurf: Wir nehmen sie hier immer auf, wenn wir sie für das Overlay brauchen. 
            // Optimierung: Nur anhängen wenn wir vermuten es wird ein PB (einfacher: Immer für den Slot aufnehmen)
            x: m.worldPositionX,
            z: m.worldPositionZ,
            y: m.yaw
        });
    }

    /**
     * Zählt die Anzahl der aktiven menschlichen Fahrer in der Session.
     */
    public getHumanCount(): number {
        let count = 0;
        for (const [_, p] of this.players) {
            if (p.isHuman && p.gameName && !p.gameName.startsWith('Unknown_')) {
                count++;
            }
        }
        return count;
    }

    /** Setzt das Flag für "Session beendet" (z.B. nach Empfang des SEND-Events). */
    public handleSessionEnd() {
        this.isSessionEnded = true;
    }

    /** Dummy-Methode für Interface-Kompatibilität (Wird in F1 2025 seltener genutzt). */
    public updateLapPositions(buffer: Buffer) {
        // Implementierung optional für Paket 15
    }

    /**
     * Synchronisiert die Historie einer Session (vergangene Runden und Sektoren).
     * Wichtig nach einem Verbindungswiederaufbau.
     * 
     * @param data Session-History Paket.
     */
    public updateSessionHistory(data: PacketSessionHistoryData) {
        this.incrementPackets();
        const p = this.getPlayer(data.carIdx);
        if (!p.isHuman) return;

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
                    isValid: (hLap.lapValidBitFlags & 0x01) !== 0,
                    sector1Ms: s1Ms > 0 ? s1Ms : undefined,
                    sector2Ms: s2Ms > 0 ? s2Ms : undefined,
                    sector3Ms: s3Ms > 0 ? s3Ms : undefined
                };
                p.laps.push(stateLap);
            } else {
                if (s1Ms > 0) stateLap.sector1Ms = s1Ms;
                if (s2Ms > 0) stateLap.sector2Ms = s2Ms;
                if (s3Ms > 0) stateLap.sector3Ms = s3Ms;
            }
        }
    }

    /**
     * Baut das Payload-Objekt für die Übertragung an das Frontend zusammen.
     * Nutzt den PayloadMapper zur Transformation und leert temporäre Ereignis-Buffer.
     * 
     * @returns Komplettes Session-Status Objekt für die API/SSE.
     */
    public buildPayloadAndClear() {
        const participantsList = Array.from(this.players.entries())
            .filter(([_, p]) => p.gameName && !p.gameName.startsWith('Unknown_'))
            .map(([_, p]) => PayloadMapper.mapPlayer(_, p, this.sessionData));

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
            trackFlags: this.trackFlags,
            lapPositions,
            finalClassification: this.finalClassification,
            // Track Metadaten für das Kurven-Mapping im Backend (nur senden, wenn geladen)
            trackMetadata: this.trackIntel.getMetadata(),
        };
    }

    /** Aktualisiert Basis-Informationen zum Teilnehmer. */
    public updateParticipant(carIdx: number, data: ParticipantData) {
        const p = this.getPlayer(carIdx);
        if (data.name?.trim().length) p.gameName = data.name;
        p.isHuman = data.aiControlled === 1; // F1 25: 1 = Human, 0 = AI
        p.teamId = data.teamId;
        p.participantData = data;
    }

    /** Aktualisiert Telemetrie (Speed, etc.) und trackt Topspeed. */
    public updateTelemetry(carIdx: number, data: CarTelemetryData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        if (data.speed > p.topSpeedKmh) p.topSpeedKmh = data.speed;
        p.telemetryData = data;
    }

    /** Aktualisiert Status-Daten (Reifen, Mischung, FIA Flaggen). */
    public updateCarStatus(carIdx: number, data: CarStatusData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.carStatusData = data;
    }

    /** Aktualisiert Schadensdaten des Fahrzeugs. */
    public updateCarDamage(carIdx: number, data: CarDamageData) {
        this.incrementPackets();
        this.getPlayer(carIdx).carDamageData = data;
    }

    /** Aktualisiert das Fahrzeug-Setup (Packet 5). */
    public updateCarSetup(carIdx: number, data: any) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        // Wir speichern das Setup nur, wenn es sich ändert oder noch keins da ist
        p.carSetupData = data;
    }

    /** Aktualisiert Bewegungsdaten (Position, G-Kräfte). */
    public updateMotion(carIdx: number, data: MotionData) {
        this.incrementPackets();
        this.getPlayer(carIdx).motionData = data;
    }

    /** Aktualisiert erweiterte Bewegungsdaten (Aero-Höhe etc.). */
    public updateMotionEx(carIdx: number, data: MotionExData) {
        this.incrementPackets();
        this.getPlayer(carIdx).motionExData = data;
    }

    /** Aktualisiert verfügbare Reifensätze. */
    public updateTyreSets(carIdx: number, tyreSets: TyreSetData[]) {
        this.incrementPackets();
        this.getPlayer(carIdx).tyreSets = tyreSets;
    }

    /** Speichert das finale Klassement am Ende des Rennens/Qualifyings. */
    public updateFinalClassification(data: PacketFinalClassificationData) {
        this.incrementPackets();
        this.finalClassification = data.classificationData;
        
        // Übertrage finale Daten in die PlayerStates
        data.classificationData.forEach((c, i) => {
            const p = this.getPlayer(i);
            p.totalRaceTime = c.totalRaceTime;
            p.penaltiesCount = c.numPenalties;
        });

        this.isSessionEnded = true;
    }

    /** Gibt eine Zusammenfassung des Session-Status für das Terminal-Dashboard zurück. */
    public getDashboardState() {
        return {
            sessionId: 'aktuell',
            trackName: this.trackName,
            sessionType: this.sessionType,
            isActive: this.isActive,
            packetCount: this.packetCount,
            lastPacketTime: this.lastPacketTime
        };
    }

    /**
     * Prüft ob noch ungesendete historisierte Daten (Runden) vorliegen.
     * Ermöglicht das "Draining" in kleinen Chunks bei großen Replays.
     */
    public hasPendingData(): boolean {
        for (const [, p] of this.players) {
            if (p.laps.length > 0 || p.speedTraps.length > 0) return true;
        }
        return this.lapPositions.length > 0 || this.incidentManager.hasPendingEvents();
    }
}
