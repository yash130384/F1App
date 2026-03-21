/**
 * Globaler In-Memory-Store für die aktuellsten Live-Telemetriedaten.
 * Wird vom /api/telemetry POST-Handler befüllt und vom SSE-Endpoint gelesen.
 */

declare global {
    // eslint-disable-next-line no-var
    var __liveState: LiveState | null;
    // eslint-disable-next-line no-var
    var __sseClients: Set<ReadableStreamDefaultController>;
}

export interface Incident {
    timestamp: number;
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    details: string;
    vehicleIdx?: number;
    otherVehicleIdx?: number;
    lapNum?: number;
}

export interface LivePlayerState {
    gameName: string;
    position: number;
    isHuman: boolean;
    teamId: number;
    pitStops: number;
    warnings: number;
    penaltiesTime: number;
    // Telemetrie
    speedKmh: number;
    throttle: number;
    brake: number;
    steer: number;
    clutch: number;
    gear: number;
    engineRPM: number;
    drs: number;
    brakesTemperature: number[];
    tyresSurfaceTemperature: number[];
    tyresInnerTemperature: number[];
    tyresPressure: number[];
    // G-Kräfte
    gForceLateral: number;
    gForceLongitudinal: number;
    gForceVertical: number;
    // Car Status
    ersDeployMode: number;
    fuelMix: number;
    fuelRemainingLaps: number;
    fuelInTank: number;
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    // Damage
    tyreBlisters: number[];
    tyresWear: number[];
    tyresDamage: number[];
    brakesDamage: number[];
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    gearBoxDamage: number;
    engineDamage: number;
    // Lap Data
    currentLapTimeInMS: number;
    lastLapTimeInMS: number;
    currentLapNum: number;
    pitStatus: number;
    deltaToCarInFrontMs: number;
    deltaToRaceLeaderMs: number;
    pitStopWindowIdealLap: number;
    pitStopWindowLatestLap: number;
    pitStopRejoinPosition: number;
    tyreSets?: any[];
}

export interface LiveState {
    sessionType: string;
    trackId: number;
    trackLength: number;
    timestamp: number;
    players: LivePlayerState[];
    incidentLog?: Incident[];
    trackFlags?: number;
    sessionData?: any;
}

// Initialisierung
if (!global.__liveState) global.__liveState = null;
if (!global.__sseClients) global.__sseClients = new Set();

export function updateLiveState(state: LiveState) {
    global.__liveState = state;
    // Alle SSE-Clients benachrichtigen
    const data = `data: ${JSON.stringify(state)}\n\n`;
    for (const controller of global.__sseClients) {
        try {
            controller.enqueue(new TextEncoder().encode(data));
        } catch {
            global.__sseClients.delete(controller);
        }
    }
}

export function getLiveState(): LiveState | null {
    return global.__liveState;
}

export function addSseClient(controller: ReadableStreamDefaultController) {
    global.__sseClients.add(controller);
}

export function removeSseClient(controller: ReadableStreamDefaultController) {
    global.__sseClients.delete(controller);
}
