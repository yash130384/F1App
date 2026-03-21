"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSession = parseSession;
const TRACK_MAP = {
    0: 'Melbourne',
    1: 'Paul Ricard',
    2: 'Shanghai',
    3: 'Sakhir (Bahrain)',
    4: 'Catalunya',
    5: 'Monaco',
    6: 'Montreal',
    7: 'Silverstone',
    8: 'Hockenheim',
    9: 'Hungaroring',
    10: 'Spa',
    11: 'Monza',
    12: 'Singapore',
    13: 'Suzuka',
    14: 'Abu Dhabi',
    15: 'Texas',
    16: 'Brazil',
    17: 'Austria',
    18: 'Sochi',
    19: 'Mexico',
    20: 'Baku',
    21: 'Sakhir Short',
    22: 'Silverstone Short',
    23: 'Texas Short',
    24: 'Suzuka Short',
    25: 'Hanoi',
    26: 'Zandvoort',
    27: 'Imola',
    28: 'Portimão',
    29: 'Jeddah',
    30: 'Miami',
    31: 'Las Vegas',
    32: 'Losail (Qatar)'
};
function parseSession(buffer) {
    const sessionTypeRaw = buffer.readUInt8(35);
    let sessionTypeMapped = "Unknown";
    if (sessionTypeRaw >= 1 && sessionTypeRaw <= 4)
        sessionTypeMapped = "Practice";
    else if (sessionTypeRaw >= 5 && sessionTypeRaw <= 9)
        sessionTypeMapped = "Qualifying";
    else if (sessionTypeRaw >= 10 && sessionTypeRaw <= 15)
        sessionTypeMapped = "Race";
    else if (sessionTypeRaw === 13)
        sessionTypeMapped = "Time Trial";
    else
        sessionTypeMapped = `Unknown_${sessionTypeRaw}`;
    const trackId = buffer.readInt8(36);
    const trackName = TRACK_MAP[trackId] || `Unknown (${trackId})`;
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
