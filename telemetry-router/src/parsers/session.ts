/**
 * Repräsentiert die Daten einer F1-Session (Wetter, Strecke, Modus).
 */
export interface SessionData {
    /** Wetter-Status (0=Sonnig, 1=Heiter, 2=Bewölkt, etc.) */
    weather: number;
    /** Streckentemperatur in Grad Celsius */
    trackTemperature: number;
    /** Lufttemperatur in Grad Celsius */
    airTemperature: number;
    /** Gesamtzahl der Runden im Rennen (0 bei Zeitfahren) */
    totalLaps: number;
    /** Länge der Strecke in Metern */
    trackLength: number;
    /** Roher Typ-Index der Session */
    sessionTypeRaw: number;
    /** Gemappter Name der Session (z.B. "Qualifying 1") */
    sessionTypeMapped: string;
    /** Interne Track-ID des Spiels */
    trackId: number;
    /** Name der Rennstrecke */
    trackName: string;
    /** Formel-Klasse (0=F1 Modern, 1=F1 Classic, etc.) */
    formula: number;
    /** Verbleibende Zeit der Session in Sekunden */
    sessionTimeLeft: number;
    /** Gesamtdauer der Session in Sekunden */
    sessionDuration: number;
    /** Boxengassen-Geschwindigkeitslimit in km/h */
    pitSpeedLimit: number;
    /** Ob das Spiel pausiert ist (0=Nein, 1=Ja) */
    gamePaused: number;
    /** Ob der aktuelle Spieler zuschaut (Spectator) */
    isSpectating: number;
    /** Auto-Index des beobachteten Fahrers */
    spectatorCarIndex: number;
    /** Unterstützung für SLI-Pro Displays */
    sliProNativeSupport: number;
    /** Anzahl der Streckenabschnitte (Marshal Zones) */
    numMarshalZones: number;
    /** Details zu den Marshall-Zonen */
    marshalZones: { zoneStart: number, zoneFlag: number }[];
    /** Status des Safety Cars (0=Keines, 1=Full SC, 2=VSC, 3=Formation Lap) */
    safetyCarStatus: number;
    /** Ob es sich um ein Online-Spiel handelt */
    networkGame: number;
    /** Anzahl der Wettervorhersage-Datenpunkte */
    numWeatherForecastSamples: number;
    /** Liste der Wettervorhersagen */
    weatherForecastSamples: any[];
    /** Genauigkeit der Vorhersage (0=Ungefähr, 1=Präzise) */
    forecastAccuracy: number;
    /** KI-Schwierigkeitsgrad (0-110) */
    aiDifficulty: number;
    /** Ideal-Runde für den Boxenstopp */
    pitStopWindowIdealLap: number;
    /** Späteste Runde für den Boxenstopp */
    pitStopWindowLatestLap: number;
    /** Erwartete Position nach dem Boxenstopp */
    pitStopRejoinPosition: number;
    /** Anzahl der SC-Phasen in dieser Session */
    numSafetyCarPeriods: number;
    /** Anzahl der VSC-Phasen */
    numVirtualSafetyCarPeriods: number;
    /** Anzahl der Rot-Phasen */
    numRedFlagPeriods: number;
    /** Start-Distanz von Sektor 2 */
    sector2LapDistanceStart: number;
    /** Start-Distanz von Sektor 3 */
    sector3LapDistanceStart: number;
    // ... weitere Felder werden hier direkt gemappt
    [key: string]: any; 
}

/**
 * Mapping-Tabelle für Strecken-IDs zu Klarnamen.
 */
const TRACK_MAP: Record<number, string> = {
    0: 'Melbourne', 1: 'Paul Ricard', 2: 'Shanghai', 3: 'Sakhir (Bahrain)',
    4: 'Catalunya', 5: 'Monaco', 6: 'Montreal', 7: 'Silverstone',
    8: 'Hockenheim', 9: 'Hungaroring', 10: 'Spa', 11: 'Monza',
    12: 'Singapore', 13: 'Suzuka', 14: 'Abu Dhabi', 15: 'Texas',
    16: 'Brazil', 17: 'Austria', 18: 'Sochi', 19: 'Mexico',
    20: 'Baku', 21: 'Sakhir Short', 22: 'Silverstone Short', 23: 'Texas Short',
    24: 'Suzuka Short', 25: 'Hanoi', 26: 'Zandvoort', 27: 'Imola',
    28: 'Portimão', 29: 'Jeddah', 30: 'Miami', 31: 'Las Vegas', 32: 'Losail (Qatar)'
};

/**
 * Parsed das Paket ID 1 (Session Data).
 * Enthält globale Informationen über die aktuelle Sitzung, das Wetter und die Strecke.
 * 
 * @param buffer Der rohe binäre Buffer des UDP-Pakets.
 * @returns Objekt mit detaillierten Session-Informationen.
 */
export function parseSession(buffer: Buffer): SessionData {
    // Session Typ Mapping (Training, Quali, Rennen)
    const sessionTypeRaw = buffer.readUInt8(35);
    let sessionTypeMapped = "Unknown";
    if (sessionTypeRaw >= 1 && sessionTypeRaw <= 4) sessionTypeMapped = `Practice ${sessionTypeRaw}`;
    else if (sessionTypeRaw === 5) sessionTypeMapped = "Qualifying 1";
    else if (sessionTypeRaw === 6) sessionTypeMapped = "Qualifying 2";
    else if (sessionTypeRaw === 7) sessionTypeMapped = "Qualifying 3";
    else if (sessionTypeRaw === 8) sessionTypeMapped = "Short Qualifying";
    else if (sessionTypeRaw === 9) sessionTypeMapped = "OSQ";
    else if (sessionTypeRaw >= 10 && sessionTypeRaw <= 12) sessionTypeMapped = `Race ${sessionTypeRaw - 9}`;
    else if (sessionTypeRaw === 13) sessionTypeMapped = "Time Trial";
    else sessionTypeMapped = `Unknown_${sessionTypeRaw}`;

    const trackId = buffer.readInt8(36);
    const trackName = TRACK_MAP[trackId] || `Unknown (${trackId})`;

    // Marshal Zonen extrahieren (Anzeige von lokalen Flaggen auf der Strecke)
    const marshalZones = [];
    for (let i = 0; i < 21; i++) {
        const offset = 48 + (i * 5);
        marshalZones.push({
            zoneStart: buffer.readFloatLE(offset),
            zoneFlag: buffer.readInt8(offset + 4)
        });
    }

    // Wettervorhersage-Datenpunkte (64 Samples)
    const weatherForecastSamples = [];
    for (let i = 0; i < 64; i++) {
        const offset = 156 + (i * 8);
        weatherForecastSamples.push({
            sessionType: buffer.readUInt8(offset),
            timeOffset: buffer.readUInt8(offset + 1),
            weather: buffer.readUInt8(offset + 2),
            trackTemperature: buffer.readInt8(offset + 3),
            trackTemperatureChange: buffer.readInt8(offset + 4),
            airTemperature: buffer.readInt8(offset + 5),
            airTemperatureChange: buffer.readInt8(offset + 6),
            rainPercentage: buffer.readUInt8(offset + 7)
        });
    }

    // Wochenendstruktur (Reihenfolge der Sessions)
    const weekendStructure = [];
    for (let i = 0; i < 12; i++) {
        weekendStructure.push(buffer.readUInt8(733 + i));
    }

    return {
        weather: buffer.readUInt8(29),
        trackTemperature: buffer.readInt8(30),
        airTemperature: buffer.readInt8(31),
        totalLaps: buffer.readUInt8(32),
        trackLength: buffer.readUInt16LE(33),
        sessionTypeRaw,
        sessionTypeMapped,
        trackId,
        trackName,
        formula: buffer.readUInt8(37),
        sessionTimeLeft: buffer.readUInt16LE(38),
        sessionDuration: buffer.readUInt16LE(40),
        pitSpeedLimit: buffer.readUInt8(42),
        gamePaused: buffer.readUInt8(43),
        isSpectating: buffer.readUInt8(44),
        spectatorCarIndex: buffer.readUInt8(45),
        sliProNativeSupport: buffer.readUInt8(46),
        numMarshalZones: buffer.readUInt8(47),
        marshalZones,
        safetyCarStatus: buffer.readUInt8(153),
        networkGame: buffer.readUInt8(154),
        numWeatherForecastSamples: buffer.readUInt8(155),
        weatherForecastSamples,
        forecastAccuracy: buffer.readUInt8(668),
        aiDifficulty: buffer.readUInt8(669),
        seasonLinkIdentifier: buffer.readUInt32LE(670),
        weekendLinkIdentifier: buffer.readUInt32LE(674),
        sessionLinkIdentifier: buffer.readUInt32LE(678),
        pitStopWindowIdealLap: buffer.readUInt8(682),
        pitStopWindowLatestLap: buffer.readUInt8(683),
        pitStopRejoinPosition: buffer.readUInt8(684),
        steeringAssist: buffer.readUInt8(685),
        brakingAssist: buffer.readUInt8(686),
        gearboxAssist: buffer.readUInt8(687),
        pitAssist: buffer.readUInt8(688),
        pitReleaseAssist: buffer.readUInt8(689),
        ERSAssist: buffer.readUInt8(690),
        DRSAssist: buffer.readUInt8(691),
        dynamicRacingLine: buffer.readUInt8(692),
        dynamicRacingLineType: buffer.readUInt8(693),
        gameMode: buffer.readUInt8(694),
        ruleSet: buffer.readUInt8(695),
        timeOfDay: buffer.readUInt32LE(696),
        sessionLength: buffer.readUInt8(700),
        speedUnitsLeadPlayer: buffer.readUInt8(701),
        temperatureUnitsLeadPlayer: buffer.readUInt8(702),
        speedUnitsSecondaryPlayer: buffer.readUInt8(703),
        temperatureUnitsSecondaryPlayer: buffer.readUInt8(704),
        numSafetyCarPeriods: buffer.readUInt8(705),
        numVirtualSafetyCarPeriods: buffer.readUInt8(706),
        numRedFlagPeriods: buffer.readUInt8(707),
        equalCarPerformance: buffer.readUInt8(708),
        recoveryMode: buffer.readUInt8(709),
        flashbackLimit: buffer.readUInt8(710),
        surfaceType: buffer.readUInt8(711),
        lowFuelMode: buffer.readUInt8(712),
        raceStarts: buffer.readUInt8(713),
        tyreTemperature: buffer.readUInt8(714),
        pitLaneTyreSim: buffer.readUInt8(715),
        carDamage: buffer.readUInt8(716),
        carDamageRate: buffer.readUInt8(717),
        collisions: buffer.readUInt8(718),
        collisionsOffForFirstLapOnly: buffer.readUInt8(719),
        mpUnsafePitRelease: buffer.readUInt8(720),
        mpOffForGriefing: buffer.readUInt8(721),
        cornerCuttingStringency: buffer.readUInt8(722),
        parcFermeRules: buffer.readUInt8(723),
        pitStopExperience: buffer.readUInt8(724),
        safetyCar: buffer.readUInt8(725),
        safetyCarExperience: buffer.readUInt8(726),
        formationLap: buffer.readUInt8(727),
        formationLapExperience: buffer.readUInt8(728),
        redFlags: buffer.readUInt8(729),
        affectsLicenceLevelSolo: buffer.readUInt8(730),
        affectsLicenceLevelMP: buffer.readUInt8(731),
        numSessionsInWeekend: buffer.readUInt8(732),
        weekendStructure,
        sector2LapDistanceStart: buffer.readFloatLE(745),
        sector3LapDistanceStart: buffer.readFloatLE(749)
    };
}
