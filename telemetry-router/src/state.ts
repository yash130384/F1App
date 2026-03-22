import { ParticipantData } from './parsers/participants';
import { LapData } from './parsers/lapData';
import { CarTelemetryData } from './parsers/telemetry';
import { CarDamageData } from './parsers/carDamage';
import { CarStatusData } from './parsers/carStatus';
import { MotionData } from './parsers/motionData';
import { TyreSetData } from './parsers/tyreSets';
import { EventData } from './parsers/eventData';
import { MotionExData } from './parsers/motionEx';

export interface LapEntry {
    lapNumber: number;
    lapTimeMs: number;
    isValid: boolean;
    tyreCompound?: number;
    isPitLap?: boolean;
    sector1Ms?: number;
    sector2Ms?: number;
    sector3Ms?: number;
    carDamage?: CarDamageSnapshot;
    samples?: any[];
}

export interface CarDamageSnapshot {
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    floorDamage: number;
    diffuserDamage: number;
    sidepodDamage: number;
    gearBoxDamage: number;
    engineDamage: number;
    engineBlown: number;
    engineSeized: number;
}

export interface SafetyCarEvent {
    safetyCarType: number; // 1=Full SC, 2=VSC, 3=Formation Lap
    eventType: number;     // 0=Deployed, 1=Returning, 2=Returned, 3=Resume Race
    lapNumber: number;
}

// Position eines Fahrzeugs pro Runde (aus Paket ID 15)
export interface LapPositionEntry {
    carIndex: number;
    lapNumber: number;
    position: number;
}

export interface IncidentEntry {
    timestamp: number;
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    details: string;
    vehicleIdx?: number;
    otherVehicleIdx?: number;
    lapNum?: number;
}

export interface PlayerState {
    gameName: string;
    position: number;
    lapDistance: number;
    fastestLapMs: number | null;
    topSpeedKmh: number;
    isHuman: boolean;
    startPosition: number;
    teamId: number;
    pitStops: number;
    warnings: number;
    penaltiesTime: number;
    laps: LapEntry[];
    // Internes Tracking
    currentLapNum: number;
    // Vollständige geparste Pakete
    participantData?: ParticipantData;
    lapData?: LapData;
    telemetryData?: CarTelemetryData;
    carStatusData?: CarStatusData;
    carDamageData?: CarDamageData;
    motionData?: MotionData;
    motionExData?: MotionExData;
    tyreSets?: TyreSetData[];
    currentLapSamples: any[];
    bestLapSamples: any[];
}

export class SessionState {
    public sessionType: string = 'Unknown';
    public trackId: number = -1;
    public trackName: string = 'Unknown';
    public trackLength: number = 0;
    public isActive: boolean = false;
    public isSessionEnded: boolean = false;
    public sessionData?: any;
    public packetCount: number = 0;
    public lastPacketTime: number = 0;

    private incrementPackets() {
        this.packetCount++;
        this.lastPacketTime = Date.now();
    }

    public trackFlags: number = 0; // 0=none, 1=green, 2=blue, 3=yellow
    private safetyCarEvents: SafetyCarEvent[] = [];
    private incidentLog: IncidentEntry[] = [];
    private lapPositions: LapPositionEntry[] = [];

    public handleSessionEnd() {
        this.isSessionEnded = true;
    }

    public addSafetyCarEvent(safetyCarType: number, eventType: number) {
        let lapNumber = 0;
        for (const [, p] of this.players) {
            if (p.currentLapNum > 0) {
                lapNumber = p.currentLapNum;
                break;
            }
        }
        this.safetyCarEvents.push({ safetyCarType, eventType, lapNumber });
        
        const types = ['None', 'Full SC', 'VSC', 'Formation Lap'];
        const events = ['Deployed', 'Returning', 'Returned', 'Resume Race'];
        
        this.addIncident({
            type: 'SAFETY_CAR',
            details: `${types[safetyCarType]} ${events[eventType]}`,
            lapNum: lapNumber
        });
    }

    public addIncident(incident: Omit<IncidentEntry, 'timestamp'>) {
        this.incidentLog.push({
            ...incident,
            timestamp: Date.now()
        });
        // Keep log concise (e.g., last 50)
        if (this.incidentLog.length > 50) this.incidentLog.shift();
    }

    public handleEvent(event: EventData) {
        const car = event.vehicleIdx !== undefined ? this.getPlayer(event.vehicleIdx) : null;
        const other = event.otherVehicleIdx !== undefined ? this.getPlayer(event.otherVehicleIdx) : null;

        if (event.eventStringCode === 'PENA') {
            this.addIncident({
                type: 'PENALTY',
                details: `Penalty for ${car?.gameName || 'Car '+event.vehicleIdx}: ${event.time}s`,
                vehicleIdx: event.vehicleIdx,
                lapNum: event.lapNum
            });
        } else if (event.eventStringCode === 'COLL') {
            const v1 = this.getPlayer(event.vehicle1Idx || 0);
            const v2 = this.getPlayer(event.vehicle2Idx || 0);
            this.addIncident({
                type: 'COLLISION',
                details: `Collision between ${v1.gameName} and ${v2.gameName}`,
                vehicleIdx: event.vehicle1Idx,
                otherVehicleIdx: event.vehicle2Idx
            });
        } else if (event.eventStringCode === 'OVTK') {
            const over = this.getPlayer(event.overtakingVehicleIdx || 0);
            const under = this.getPlayer(event.beingOvertakenVehicleIdx || 0);
            this.addIncident({
                type: 'OVERTAKE',
                details: `${over.gameName} overtook ${under.gameName}`,
                vehicleIdx: event.overtakingVehicleIdx,
                otherVehicleIdx: event.beingOvertakenVehicleIdx
            });
        }
    }

    // Verarbeite das LapPositions-Paket (ID 15): m_positionForVehicleIdx[50][22]
    public updateLapPositions(buffer: Buffer) {
        if (buffer.length < 31) return;
        const numLaps = buffer.readUInt8(29);
        const lapStart = buffer.readUInt8(30);

        // Daten beginnen bei Byte 31: [numLaps][22] uint8
        for (let lap = 0; lap < numLaps && lap < 50; lap++) {
            const actualLapNum = lapStart + lap + 1;
            for (let car = 0; car < 22; car++) {
                const offset = 31 + lap * 22 + car;
                if (offset >= buffer.length) break;
                const pos = buffer.readUInt8(offset);
                if (pos === 0) continue; // 0 = kein Eintrag
                // Duplikate vermeiden
                const existing = this.lapPositions.find(
                    e => e.carIndex === car && e.lapNumber === actualLapNum
                );
                if (!existing) {
                    this.lapPositions.push({ carIndex: car, lapNumber: actualLapNum, position: pos });
                }
            }
        }
    }

    // Map: Fahrzeug-Index (0-21) → PlayerState
    private players: Map<number, PlayerState> = new Map();

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
                currentLapSamples: [],
                bestLapSamples: []
            });
        }
        return this.players.get(carIdx)!;
    }

    public updateParticipant(carIdx: number, data: ParticipantData) {
        const p = this.getPlayer(carIdx);
        if (data.name && data.name.trim().length > 0) {
            p.gameName = data.name;
        }
        p.isHuman = data.isHuman;
        p.teamId = data.teamId;
        p.participantData = data;
    }

    public updateLapData(carIdx: number, data: LapData) {
        const p = this.getPlayer(carIdx);
        p.position = data.carPosition;

        if (p.startPosition === 0 && data.gridPosition > 0) {
            p.startPosition = data.gridPosition;
        }

        p.pitStops = data.numPitStops;
        p.warnings = data.totalWarnings + data.cornerCuttingWarnings;
        p.penaltiesTime = data.penalties;

        // Nur für menschliche Fahrer Runden speichern
        if (p.isHuman && data.currentLapNum > p.currentLapNum && p.currentLapNum > 0) {
            if (data.lastLapTimeInMS > 0) {
                // Sektorzeiten berechnen (Minuten-Teil * 60000 + Millisekunden-Teil)
                const s1Ms = data.sector1TimeMinutesPart * 60000 + data.sector1TimeMSPart;
                const s2Ms = data.sector2TimeMinutesPart * 60000 + data.sector2TimeMSPart;
                const s3Ms = s1Ms > 0 && s2Ms > 0
                    ? Math.max(0, data.lastLapTimeInMS - s1Ms - s2Ms)
                    : 0;

                // Aktuellen Schadensstand erfassen
                let damageSnapshot: CarDamageSnapshot | undefined;
                if (p.carDamageData) {
                    damageSnapshot = {
                        frontLeftWingDamage: p.carDamageData.frontLeftWingDamage,
                        frontRightWingDamage: p.carDamageData.frontRightWingDamage,
                        rearWingDamage: p.carDamageData.rearWingDamage,
                        floorDamage: p.carDamageData.floorDamage,
                        diffuserDamage: p.carDamageData.diffuserDamage,
                        sidepodDamage: p.carDamageData.sidepodDamage,
                        gearBoxDamage: p.carDamageData.gearBoxDamage,
                        engineDamage: p.carDamageData.engineDamage,
                        engineBlown: p.carDamageData.engineBlown,
                        engineSeized: p.carDamageData.engineSeized,
                    };
                }

                // Best Lap Logik
                if (!data.currentLapInvalid && (p.fastestLapMs === null || data.lastLapTimeInMS < p.fastestLapMs)) {
                    p.fastestLapMs = data.lastLapTimeInMS;
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
                    carDamage: damageSnapshot,
                    // Nur Samples mitsenden, wenn es die neue Bestzeit war
                    samples: (!data.currentLapInvalid && data.lastLapTimeInMS === p.fastestLapMs) ? p.bestLapSamples : undefined
                });

                // Buffer für neue Runde leeren
                p.currentLapSamples = [];
            }
        }
        
        // Sample mit voller Frequenz aufzeichnen (z.B. 60Hz) für präzise Analysen
        if (p.isHuman && data.currentLapNum > 0) {
            this.maybeRecordSample(p, data);
        }

        p.currentLapNum = data.currentLapNum;
        p.lapData = data;
    }

    private maybeRecordSample(p: PlayerState, lap: LapData) {
        if (!p.telemetryData || !p.motionData) return;

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

    public updateSession(data: any) {
        this.incrementPackets();
        this.sessionType = data.sessionTypeMapped;
        this.trackId = data.trackId;
        this.trackName = data.trackName;
        this.trackLength = data.trackLength;
        this.sessionData = data;
        this.isActive = true;
    }

    public updateCarStatus(carIdx: number, data: CarStatusData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.carStatusData = data;
    }

    public updateTelemetry(carIdx: number, data: CarTelemetryData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        if (data.speedKmh > p.topSpeedKmh) {
            p.topSpeedKmh = data.speedKmh;
        }
        p.telemetryData = data;
    }

    public updateCarDamage(carIdx: number, data: CarDamageData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.carDamageData = data;
    }

    public updateMotion(carIdx: number, data: MotionData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.motionData = data;
    }

    public updateMotionEx(carIdx: number, data: MotionExData) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.motionExData = data;
    }

    public updateTyreSets(carIdx: number, tyreSets: TyreSetData[]) {
        this.incrementPackets();
        const p = this.getPlayer(carIdx);
        p.tyreSets = tyreSets;
    }

    // Payload erstellen und Runden/Events leeren, um keine Duplikate zu senden
    public buildPayloadAndClear() {
        const participantsList = Array.from(this.players.entries())
            .filter(([_, p]) => p.gameName && !p.gameName.startsWith('Unknown_'))
            .map(([_, p]) => {
                const lapsToSend = [...p.laps];
                p.laps = []; // Nach dem Extrahieren leeren

                // Kompakten Delta-Wert berechnen (ms)
                const lapData = p.lapData;
                const deltaToFront = lapData
                    ? lapData.deltaToCarInFrontMinutesPart * 60000 + lapData.deltaToCarInFrontMSPart
                    : 0;
                const deltaToLeader = lapData
                    ? lapData.deltaToRaceLeaderMinutesPart * 60000 + lapData.deltaToRaceLeaderMSPart
                    : 0;

                return {
                    gameName: p.gameName,
                    position: p.position,
                    lapDistance: p.lapDistance,
                    fastestLapMs: p.fastestLapMs,
                    topSpeedKmh: p.topSpeedKmh,
                    isHuman: p.isHuman,
                    startPosition: p.startPosition,
                    teamId: p.teamId,
                    pitStops: p.pitStops,
                    warnings: p.warnings,
                    penaltiesTime: p.penaltiesTime,
                    laps: lapsToSend,
                    // Live-Daten für SSE
                    telemetry: p.telemetryData ? {
                        speedKmh: p.telemetryData.speedKmh,
                        throttle: p.telemetryData.throttle,
                        brake: p.telemetryData.brake,
                        steer: p.telemetryData.steer,
                        clutch: p.telemetryData.clutch,
                        gear: p.telemetryData.gear,
                        engineRPM: p.telemetryData.engineRPM,
                        drs: p.telemetryData.drs,
                        brakesTemperature: p.telemetryData.brakesTemperature,
                        tyresSurfaceTemperature: p.telemetryData.tyresSurfaceTemperature,
                        tyresInnerTemperature: p.telemetryData.tyresInnerTemperature,
                        tyresPressure: p.telemetryData.tyresPressure,
                    } : undefined,
                    status: p.carStatusData ? {
                        ersDeployMode: p.carStatusData.ersDeployMode,
                        ersStoreEnergy: p.carStatusData.ersStoreEnergy,
                        fuelMix: p.carStatusData.fuelMix,
                        fuelRemainingLaps: p.carStatusData.fuelRemainingLaps,
                        fuelInTank: p.carStatusData.fuelInTank,
                        visualTyreCompound: p.carStatusData.visualTyreCompound,
                        actualTyreCompound: p.carStatusData.actualTyreCompound,
                        tyresAgeLaps: p.carStatusData.tyresAgeLaps,
                    } : undefined,
                    damage: p.carDamageData ? {
                        tyreBlisters: p.carDamageData.tyreBlisters,
                        tyresWear: p.carDamageData.tyresWear,
                        tyresDamage: p.carDamageData.tyresDamage,
                        brakesDamage: p.carDamageData.brakesDamage,
                        frontLeftWingDamage: p.carDamageData.frontLeftWingDamage,
                        frontRightWingDamage: p.carDamageData.frontRightWingDamage,
                        rearWingDamage: p.carDamageData.rearWingDamage,
                        gearBoxDamage: p.carDamageData.gearBoxDamage,
                        engineDamage: p.carDamageData.engineDamage,
                    } : undefined,
                    tyreSets: p.tyreSets,
                    motion: p.motionData ? {
                        gForceLateral: p.motionData.gForceLateral,
                        gForceLongitudinal: p.motionData.gForceLongitudinal,
                        gForceVertical: p.motionData.gForceVertical,
                    } : undefined,
                    lapInfo: lapData ? {
                        currentLapNum: lapData.currentLapNum,
                        currentLapTimeInMS: lapData.currentLapTimeInMS,
                        lastLapTimeInMS: lapData.lastLapTimeInMS,
                        sector1Ms: lapData.sector1TimeMinutesPart * 60000 + lapData.sector1TimeMSPart,
                        sector2Ms: lapData.sector2TimeMinutesPart * 60000 + lapData.sector2TimeMSPart,
                        pitStatus: lapData.pitStatus,
                        driverStatus: lapData.driverStatus,
                        resultStatus: lapData.resultStatus,
                        pitLaneTimeInLaneInMS: lapData.pitLaneTimeInLaneInMS,
                        pitStopTimerInMS: lapData.pitStopTimerInMS,
                        deltaToCarInFrontMs: deltaToFront,
                        deltaToRaceLeaderMs: deltaToLeader,
                    } : undefined,
                    sessionStatus: p.carStatusData ? {
                        pitStopWindowIdealLap: (p as any).pitStopWindowIdealLap ?? 0,
                        pitStopWindowLatestLap: (p as any).pitStopWindowLatestLap ?? 0,
                        pitStopRejoinPosition: (p as any).pitStopRejoinPosition ?? 0,
                    } : undefined,
                };
            });

        // Safety-Car-Events und Positionsverlauf sammeln und leeren
        const safetyCarEvents = [...this.safetyCarEvents];
        this.safetyCarEvents = [];

        const lapPositions = [...this.lapPositions];
        this.lapPositions = [];

        return {
            sessionType: this.sessionType,
            trackId: this.trackId,
            trackName: this.trackName,
            trackLength: this.trackLength,
            isActive: this.isActive,
            isSessionEnded: false,
            sessionData: this.sessionData,
            participants: participantsList,
            safetyCarEvents,
            incidentLog: this.incidentLog,
            trackFlags: this.trackFlags,
            lapPositions,
        };
    }

    public getDashboardState() {
        return {
            sessionId: 'current',
            trackName: this.trackName,
            sessionType: this.sessionType,
            isActive: this.isActive,
            packetCount: this.packetCount,
            lastPacketTime: this.lastPacketTime
        };
    }
}
