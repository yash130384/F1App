"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
class SessionState {
    sessionType = 'Unknown';
    trackId = -1;
    trackName = 'Unknown';
    trackLength = 0;
    isActive = false;
    isSessionEnded = false;
    sessionData;
    trackFlags = 0; // 0=none, 1=green, 2=blue, 3=yellow
    safetyCarEvents = [];
    incidentLog = [];
    lapPositions = [];
    handleSessionEnd() {
        this.isSessionEnded = true;
    }
    addSafetyCarEvent(safetyCarType, eventType) {
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
    addIncident(incident) {
        this.incidentLog.push({
            ...incident,
            timestamp: Date.now()
        });
        // Keep log concise (e.g., last 50)
        if (this.incidentLog.length > 50)
            this.incidentLog.shift();
    }
    handleEvent(event) {
        const car = event.vehicleIdx !== undefined ? this.getPlayer(event.vehicleIdx) : null;
        const other = event.otherVehicleIdx !== undefined ? this.getPlayer(event.otherVehicleIdx) : null;
        if (event.eventStringCode === 'PENA') {
            this.addIncident({
                type: 'PENALTY',
                details: `Penalty for ${car?.gameName || 'Car ' + event.vehicleIdx}: ${event.time}s`,
                vehicleIdx: event.vehicleIdx,
                lapNum: event.lapNum
            });
        }
        else if (event.eventStringCode === 'COLL') {
            const v1 = this.getPlayer(event.vehicle1Idx || 0);
            const v2 = this.getPlayer(event.vehicle2Idx || 0);
            this.addIncident({
                type: 'COLLISION',
                details: `Collision between ${v1.gameName} and ${v2.gameName}`,
                vehicleIdx: event.vehicle1Idx,
                otherVehicleIdx: event.vehicle2Idx
            });
        }
        else if (event.eventStringCode === 'OVTK') {
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
    updateLapPositions(buffer) {
        if (buffer.length < 31)
            return;
        const numLaps = buffer.readUInt8(29);
        const lapStart = buffer.readUInt8(30);
        // Daten beginnen bei Byte 31: [numLaps][22] uint8
        for (let lap = 0; lap < numLaps && lap < 50; lap++) {
            const actualLapNum = lapStart + lap + 1;
            for (let car = 0; car < 22; car++) {
                const offset = 31 + lap * 22 + car;
                if (offset >= buffer.length)
                    break;
                const pos = buffer.readUInt8(offset);
                if (pos === 0)
                    continue; // 0 = kein Eintrag
                // Duplikate vermeiden
                const existing = this.lapPositions.find(e => e.carIndex === car && e.lapNumber === actualLapNum);
                if (!existing) {
                    this.lapPositions.push({ carIndex: car, lapNumber: actualLapNum, position: pos });
                }
            }
        }
    }
    // Map: Fahrzeug-Index (0-21) → PlayerState
    players = new Map();
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
                currentLapNum: 0
            });
        }
        return this.players.get(carIdx);
    }
    updateParticipant(carIdx, data) {
        const p = this.getPlayer(carIdx);
        if (data.name && data.name.trim().length > 0) {
            p.gameName = data.name;
        }
        p.isHuman = data.isHuman;
        p.teamId = data.teamId;
        p.participantData = data;
    }
    updateLapData(carIdx, data) {
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
                let damageSnapshot;
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
                });
                if (!data.currentLapInvalid && (p.fastestLapMs === null || data.lastLapTimeInMS < p.fastestLapMs)) {
                    p.fastestLapMs = data.lastLapTimeInMS;
                }
            }
        }
        p.currentLapNum = data.currentLapNum;
        p.lapData = data;
    }
    updateSession(data) {
        this.sessionType = data.sessionTypeMapped;
        this.trackId = data.trackId;
        this.trackName = data.trackName;
        this.trackLength = data.trackLength;
        this.sessionData = data;
        this.isActive = true;
    }
    updateCarStatus(carIdx, data) {
        const p = this.getPlayer(carIdx);
        p.carStatusData = data;
    }
    updateTelemetry(carIdx, data) {
        const p = this.getPlayer(carIdx);
        if (data.speedKmh > p.topSpeedKmh) {
            p.topSpeedKmh = data.speedKmh;
        }
        p.telemetryData = data;
    }
    updateCarDamage(carIdx, data) {
        const p = this.getPlayer(carIdx);
        p.carDamageData = data;
    }
    updateMotion(carIdx, data) {
        const p = this.getPlayer(carIdx);
        p.motionData = data;
    }
    updateTyreSets(carIdx, tyreSets) {
        const p = this.getPlayer(carIdx);
        p.tyreSets = tyreSets;
    }
    // Payload erstellen und Runden/Events leeren, um keine Duplikate zu senden
    buildPayloadAndClear() {
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
                    pitStatus: lapData.pitStatus,
                    deltaToCarInFrontMs: deltaToFront,
                    deltaToRaceLeaderMs: deltaToLeader,
                } : undefined,
                sessionStatus: p.carStatusData ? {
                    pitStopWindowIdealLap: p.pitStopWindowIdealLap ?? 0,
                    pitStopWindowLatestLap: p.pitStopWindowLatestLap ?? 0,
                    pitStopRejoinPosition: p.pitStopRejoinPosition ?? 0,
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
            sessionData: this.sessionData,
            participants: participantsList,
            safetyCarEvents,
            incidentLog: this.incidentLog,
            trackFlags: this.trackFlags,
            lapPositions,
        };
    }
}
exports.SessionState = SessionState;
