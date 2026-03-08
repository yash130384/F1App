export interface SessionData {
    weather: number;
    trackTemperature: number;
    airTemperature: number;
    totalLaps: number;
    trackLength: number;
    sessionTypeRaw: number;
    sessionTypeMapped: string;
    trackId: number;
    formula: number;
    sessionTimeLeft: number;
    sessionDuration: number;
    pitSpeedLimit: number;
    gamePaused: number;
    isSpectating: number;
    spectatorCarIndex: number;
    sliProNativeSupport: number;
    numMarshalZones: number;
    marshalZones: { zoneStart: number, zoneFlag: number }[];
    safetyCarStatus: number;
    networkGame: number;
    numWeatherForecastSamples: number;
    weatherForecastSamples: any[];
    forecastAccuracy: number;
    aiDifficulty: number;
    seasonLinkIdentifier: number;
    weekendLinkIdentifier: number;
    sessionLinkIdentifier: number;
    pitStopWindowIdealLap: number;
    pitStopWindowLatestLap: number;
    pitStopRejoinPosition: number;
    steeringAssist: number;
    brakingAssist: number;
    gearboxAssist: number;
    pitAssist: number;
    pitReleaseAssist: number;
    ERSAssist: number;
    DRSAssist: number;
    dynamicRacingLine: number;
    dynamicRacingLineType: number;
    gameMode: number;
    ruleSet: number;
    timeOfDay: number;
    sessionLength: number;
    speedUnitsLeadPlayer: number;
    temperatureUnitsLeadPlayer: number;
    speedUnitsSecondaryPlayer: number;
    temperatureUnitsSecondaryPlayer: number;
    numSafetyCarPeriods: number;
    numVirtualSafetyCarPeriods: number;
    numRedFlagPeriods: number;
    equalCarPerformance: number;
    recoveryMode: number;
    flashbackLimit: number;
    surfaceType: number;
    lowFuelMode: number;
    raceStarts: number;
    tyreTemperature: number;
    pitLaneTyreSim: number;
    carDamage: number;
    carDamageRate: number;
    collisions: number;
    collisionsOffForFirstLapOnly: number;
    mpUnsafePitRelease: number;
    mpOffForGriefing: number;
    cornerCuttingStringency: number;
    parcFermeRules: number;
    pitStopExperience: number;
    safetyCar: number;
    safetyCarExperience: number;
    formationLap: number;
    formationLapExperience: number;
    redFlags: number;
    affectsLicenceLevelSolo: number;
    affectsLicenceLevelMP: number;
    numSessionsInWeekend: number;
    weekendStructure: number[];
    sector2LapDistanceStart: number;
    sector3LapDistanceStart: number;
}

export function parseSession(buffer: Buffer): SessionData {
    const sessionTypeRaw = buffer.readUInt8(35);
    let sessionTypeMapped = "Unknown";
    if (sessionTypeRaw >= 1 && sessionTypeRaw <= 4) sessionTypeMapped = "Practice";
    else if (sessionTypeRaw >= 5 && sessionTypeRaw <= 9) sessionTypeMapped = "Qualifying";
    else if (sessionTypeRaw >= 10 && sessionTypeRaw <= 12) sessionTypeMapped = "Race";
    else if (sessionTypeRaw === 13) sessionTypeMapped = "Time Trial";

    const marshalZones = [];
    for (let i = 0; i < 21; i++) {
        const offset = 48 + (i * 5);
        marshalZones.push({
            zoneStart: buffer.readFloatLE(offset),
            zoneFlag: buffer.readInt8(offset + 4)
        });
    }

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
        trackId: buffer.readInt8(36),
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
