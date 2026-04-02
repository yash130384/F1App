import { LapData } from './parsers/lapData';
import { CarTelemetryData } from './parsers/telemetry';
import { CarDamageData } from './parsers/carDamage';
import { CarStatusData } from './parsers/carStatus';
import { MotionData } from './parsers/motionData';
import { TyreSetData } from './parsers/tyreSets';
import { MotionExData } from './parsers/motionEx';

/**
 * Telemetrie-Momentaufnahme während einer Runde.
 */
export interface LapSample {
    d: number;      // Distance
    s: number;      // Speed
    t: number;      // Throttle
    b: number;      // Brake
    st: number;     // Steer
    g: number;      // Gear
    rpm: number;    // RPM
    ers: number;    // ERS Level
    em: number;     // ERS Deploy Mode
    drs: number;    // DRS Active
    gLat: number;   // G-Lat
    gLon: number;   // G-Lon
    gVert: number;  // G-Vert
    tSurf: number[]; // Tyre Surface Temp
    tInner: number[]; // Tyre Inner Temp
    rHeight: number[]; // Ride Height [Front, Rear]
    // Weltkoordinaten (nur für Bestrunde / Race-Line Visualisierung)
    x?: number;     
    z?: number;
    y?: number;     // Yaw (Rotation)
}

/**
 * Repräsentiert eine einzelne Runde eines Fahrers mit Telemetrie-Zusammenfassung.
 */
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
    samples?: LapSample[];
    pitStopTimerMs?: number;
    pitLaneTimeMs?: number;
}

/**
 * Schnappschuss des Fahrzeugschadens zu einem bestimmten Zeitpunkt.
 */
export interface CarDamageSnapshot {
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    floorDamage: number;
    diffuserDamage: number;
    sidepodDamage: number;
    gearBoxDamage: number;
    engineDamage: number;
    tyresWear: number[];
    tyresDamage: number[];
    brakesDamage: number[];
}

/**
 * Ereignis-Daten für Safety-Car-Phasen.
 */
export interface SafetyCarEvent {
    safetyCarType: number; // 1=Full SC, 2=VSC, 3=Formation Lap
    eventType: number;     // 0=Deployed, 1=Returning, 2=Returned, 3=Resume Race
    lapNumber: number;
}

/**
 * Position eines Fahrzeugs pro Runde (für Positions-Historie).
 */
export interface LapPositionEntry {
    carIndex: number;
    lapNumber: number;
    position: number;
}

/**
 * Log-Eintrag für Vorfälle während einer Session.
 */
export interface IncidentEntry {
    timestamp: number;
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    details: string;
    vehicleIdx?: number;
    otherVehicleIdx?: number;
    lapNum?: number;
}

/**
 * Aktueller Zustand eines einzelnen Spielers/Fahrzeugs.
 */
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
    carSetupData?: any; 
    tyreSets?: TyreSetData[];
    speedTraps: any[];
    currentLapSamples: LapSample[];
    bestLapSamples: LapSample[];
    // Vorhersagen (meist aus CarStatus oder LapData berechnet)
    pitStopWindowIdealLap?: number;
    pitStopWindowLatestLap?: number;
    pitStopRejoinPosition?: number;
    // Resultate am Ende (F1 25)
    totalRaceTime?: number;
    penaltiesCount?: number;
}

/**
 * Repräsentiert die Teilnehmerdaten für ein Rennen.
 */
export interface ParticipantData {
    aiControlled: number;
    driverId: number;
    networkId: number;
    teamId: number;
    myTeam: number;
    raceNumber: number;
    nationality: number;
    name: string;
    yourTelemetry: number;
    showOnlineNames: number;
    techLevel: number;
    platform: number;
    numColours: number;
}
