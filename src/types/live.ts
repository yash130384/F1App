/**
 * Repräsentiert einen Vorfall während einer Live-Session.
 */
export interface Incident {
    /** Zeitstempel des Vorfalls. */
    timestamp: number;
    /** Typ des Vorfalls (Strafe, Kollision, Überholmanöver, Ausscheiden, Safety-Car). */
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    /** Detaillierte Beschreibung des Ereignisses. */
    details: string;
    /** Index des beteiligten Fahrzeugs (optional). */
    vehicleIdx?: number;
    /** Index eines zweiten beteiligten Fahrzeugs (bei Kollisionen). */
    otherVehicleIdx?: number;
    /** Runde, in der der Vorfall auftrat. */
    lapNum?: number;
}

/**
 * Detaillierter Live-Status eines einzelnen Fahrers.
 */
export interface LivePlayerState {
    /** Anzeigename im Spiel. */
    gameName: string;
    /** Aktuelle Position im Rennen/Qualifying (P1, P2, ...). */
    position: number;
    /** Ob der Fahrer ein Mensch ist oder KI. */
    isHuman: boolean;
    /** ID des Teams (z.B. Ferrari, Red Bull). */
    teamId: number;
    /** Anzahl der absolvierten Boxenstopps. */
    pitStops: number;
    /** Anzahl der Verwarnungen (Track Limits etc.). */
    warnings: number;
    /** Kumulierte Strafzeit in Sekunden. */
    penaltiesTime: number;
    
    // Telemetrie-Daten
    speedKmh: number;
    throttle: number;
    brake: number;
    steer: number;
    clutch: number;
    gear: number;
    engineRPM: number;
    drs: number;
    
    // Temperaturen & Drücke
    brakesTemperature: number[];
    tyresSurfaceTemperature: number[];
    tyresInnerTemperature: number[];
    tyresPressure: number[];
    
    // Physische Kräfte
    gForceLateral: number;
    gForceLongitudinal: number;
    gForceVertical: number;
    
    // Energie & Benzin
    ersDeployMode: number;
    ersStoreEnergy: number;
    fuelMix: number;
    fuelRemainingLaps: number;
    fuelInTank: number;
    
    // Reifen
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    
    // Schäden
    tyreBlisters: number[];
    tyresWear: number[];
    tyresDamage: number[];
    brakesDamage: number[];
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    gearBoxDamage: number;
    engineDamage: number;
    
    // Renn-Metriken
    lapDistance: number;
    currentLapTimeInMS: number;
    lastLapTimeInMS: number;
    currentLapNum: number;
    sector1Ms?: number;
    sector2Ms?: number;
    
    // Status-Flags
    pitStatus: number;
    driverStatus?: number;
    resultStatus?: number;
    
    // Boxenstopp-Details
    pitLaneTimeInLaneInMS?: number;
    pitStopTimerInMS?: number;
    
    // Abstände
    deltaToCarInFrontMs: number;
    deltaToRaceLeaderMs: number;
    
    // Strategie-Fenster
    pitStopWindowIdealLap: number;
    pitStopWindowLatestLap: number;
    pitStopRejoinPosition: number;
    
    /** Verfügbare Reifensätze (optional). */
    tyreSets?: any[];
    /** Historie der absolvierten Runden (optional). */
    laps?: any[];
}

/**
 * Gesamtzustand des Live-Streams einer Session.
 */
export interface LiveState {
    /** Eindeutige ID der Liga (optional). */
    leagueId?: string;
    /** Name der Liga (optional). */
    leagueName?: string;
    /** Typ der aktuellen Sitzung (z.B. "Race"). */
    sessionType: string;
    /** ID der Rennstrecke. */
    trackId: number;
    /** Länge der Strecke in Metern. */
    trackLength: number;
    /** Gesamtzahl der zu fahrenden Runden (optional). */
    totalLaps?: number;
    /** Zeitstempel der letzten Aktualisierung. */
    timestamp: number;
    /** Liste aller Teilnehmer und deren Zustände. */
    players: LivePlayerState[];
    /** Protokoll der Vorfälle während der Session. */
    incidentLog?: Incident[];
    /** Aktuelle FIA-Streckenflaggen (0=Keine, 1=Grün, etc.). */
    trackFlags?: number;
}
