"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayloadMapper = void 0;
/**
 * Der PayloadMapper transformiert den detaillierten internen Zustand eines Fahrers
 * in ein optimiertes Objekt für die Übertragung an das Frontend (SSE/API).
 * Er sorgt dafür, dass nur notwendige Daten gesendet werden und Runden-Buffer
 * nach der Übertragung geleert werden, um Duplikate zu vermeiden.
 */
class PayloadMapper {
    /**
     * Erstellt eine Momentaufnahme (Snapshot) für einen Fahrer, die direkt an das Frontend
     * gesendet werden kann.
     *
     * @param carIdx Index des Fahrzeugs (0-21).
     * @param p Der aktuelle Zustand des Fahrers aus dem SessionState.
     * @returns Ein flaches Objekt mit allen relevanten Telemetrie-, Status- und Schadensdaten.
     */
    static mapPlayer(carIdx, p) {
        // Runden-Buffer extrahieren und im State leeren (Vermeidung von Duplikaten bei SSE-Übertragungen)
        // Dies stellt sicher, dass jede abgeschlossene Runde nur genau einmal gesendet wird.
        const lapsToSend = [...p.laps];
        p.laps = [];
        const speedTrapsToSend = [...p.speedTraps];
        p.speedTraps = [];
        const ld = p.lapData;
        // Berechnung der Deltas zu Vorderleuten und Führendem in Millisekunden
        const deltaToFront = ld ? ld.deltaToCarInFrontMinutesPart * 60000 + ld.deltaToCarInFrontMSPart : 0;
        const deltaToLeader = ld ? ld.deltaToRaceLeaderMinutesPart * 60000 + ld.deltaToRaceLeaderMSPart : 0;
        return {
            gameName: p.gameName,
            carIndex: carIdx,
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
            // Live-Telemetrie: Dynamische Werte, die sich hochfrequent ändern
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
            // Fahrzeug-Status: ERS, Benzin, Strategie
            status: p.carStatusData ? {
                ersDeployMode: p.carStatusData.ersDeployMode,
                ersStoreEnergy: p.carStatusData.ersStoreEnergy,
                ersHarvestedThisLapMGUK: p.carStatusData.ersHarvestedThisLapMGUK,
                ersHarvestedThisLapMGUH: p.carStatusData.ersHarvestedThisLapMGUH,
                fuelMix: p.carStatusData.fuelMix,
                fuelRemainingLaps: p.carStatusData.fuelRemainingLaps,
                fuelInTank: p.carStatusData.fuelInTank,
                visualTyreCompound: p.carStatusData.visualTyreCompound,
                actualTyreCompound: p.carStatusData.actualTyreCompound,
                tyresAgeLaps: p.carStatusData.tyresAgeLaps,
                enginePowerICE: p.carStatusData.enginePowerICE,
                enginePowerMGUK: p.carStatusData.enginePowerMGUK,
                maxRPM: p.carStatusData.maxRPM,
                maxGears: p.carStatusData.maxGears,
                drsAllowed: p.carStatusData.drsAllowed,
                drsActivationDistance: p.carStatusData.drsActivationDistance,
            } : undefined,
            // Mechanischer Zustand und Schäden
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
                floorDamage: p.carDamageData.floorDamage,
                diffuserDamage: p.carDamageData.diffuserDamage,
                sidepodDamage: p.carDamageData.sidepodDamage,
            } : undefined,
            // Reifensätze und Boxenstrategie
            tyreSets: p.tyreSets,
            // Physische Kräfte (G-Kräfte)
            motion: p.motionData ? {
                gForceLateral: p.motionData.gForceLateral,
                gForceLongitudinal: p.motionData.gForceLongitudinal,
                gForceVertical: p.motionData.gForceVertical,
            } : undefined,
            // Aktuelle Rundendaten und Sektor-Splits
            lapInfo: ld ? {
                currentLapNum: ld.currentLapNum,
                currentLapTimeInMS: ld.currentLapTimeInMS,
                lastLapTimeInMS: ld.lastLapTimeInMS,
                sector1Ms: ld.sector1TimeMinutesPart * 60000 + ld.sector1TimeMSPart,
                sector2Ms: ld.sector2TimeMinutesPart * 60000 + ld.sector2TimeMSPart,
                pitStatus: ld.pitStatus,
                driverStatus: ld.driverStatus,
                resultStatus: ld.resultStatus,
                deltaToCarInFrontMs: deltaToFront,
                deltaToRaceLeaderMs: deltaToLeader,
                pitLaneTimeInLaneInMS: ld.pitLaneTimeInLaneInMS,
                pitStopTimerInMS: ld.pitStopTimerInMS,
            } : undefined,
            // Fahrzeug-Setup (Aero, Fahrwerk, Getriebe)
            setup: p.carSetupData,
            // Speed Traps der aktuellen Übertragung (wird danach geleert)
            speedTraps: [...p.speedTraps],
            // Zusätzliche Strategie-Fenster (ideal für Boxenstopp-Planung)
            sessionStatus: p.carStatusData ? {
                pitStopWindowIdealLap: p.pitStopWindowIdealLap ?? 0,
                pitStopWindowLatestLap: p.pitStopWindowLatestLap ?? 0,
                pitStopRejoinPosition: p.pitStopRejoinPosition ?? 0,
            } : undefined,
        };
    }
}
exports.PayloadMapper = PayloadMapper;
