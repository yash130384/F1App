import { PACKET_HEADER_SIZE } from './header';

export interface MarshalZone {
    zoneStart: number;
    zoneFlag: number;
}

export interface WeatherForecastSample {
    sessionType: number;
    timeOffset: number;
    weather: number;
    trackTemperature: number;
    trackTemperatureChange: number;
    airTemperature: number;
    airTemperatureChange: number;
    rainProbability: number;
}

export interface PacketSessionData {
    weather: number;
    trackTemperature: number;
    airTemperature: number;
    totalLaps: number;
    trackLength: number;
    sessionType: number;
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
    marshalZones: MarshalZone[];
    safetyCarStatus: number;
    networkGame: number;
    numWeatherForecastSamples: number;
    weatherForecastSamples: WeatherForecastSample[];
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
    ersAssist: number;
    drsAssist: number;
    dynamicRacingLine: number;
    dynamicRacingLineType: number;
    gameMode: number;
    ruleSet: number;
    timeOfDay: number;
    sessionLength: number;
}

export function parseSession(buffer: Buffer): PacketSessionData {
    // Hilfsfunktion für sicheres Lesen
    const canRead = (offset: number, length: number) => buffer.length >= offset + length;

    const marshalZones: MarshalZone[] = [];
    if (canRead(PACKET_HEADER_SIZE + 19, 1)) {
        const numMarshalZones = buffer.readUInt8(PACKET_HEADER_SIZE + 19);
        for (let i = 0; i < numMarshalZones; i++) {
            const offset = PACKET_HEADER_SIZE + 20 + (i * 5);
            if (canRead(offset, 5)) {
                marshalZones.push({
                    zoneStart: buffer.readFloatLE(offset),
                    zoneFlag: buffer.readInt8(offset + 4),
                });
            }
        }
    }

    const weatherForecastSamples: WeatherForecastSample[] = [];
    if (canRead(PACKET_HEADER_SIZE + 130, 1)) {
        const numWeatherForecastSamples = buffer.readUInt8(PACKET_HEADER_SIZE + 130);
        for (let i = 0; i < numWeatherForecastSamples; i++) {
            const offset = PACKET_HEADER_SIZE + 131 + (i * 8);
            if (canRead(offset, 8)) {
                weatherForecastSamples.push({
                    sessionType: buffer.readUInt8(offset),
                    timeOffset: buffer.readUInt8(offset + 1),
                    weather: buffer.readUInt8(offset + 2),
                    trackTemperature: buffer.readInt8(offset + 3),
                    trackTemperatureChange: buffer.readInt8(offset + 4),
                    airTemperature: buffer.readInt8(offset + 5),
                    airTemperatureChange: buffer.readInt8(offset + 6),
                    rainProbability: buffer.readUInt8(offset + 7),
                });
            }
        }
    }

    // Default-Werte falls Paket zu kurz
    return {
        weather: canRead(PACKET_HEADER_SIZE, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE) : 0,
        trackTemperature: canRead(PACKET_HEADER_SIZE + 1, 1) ? buffer.readInt8(PACKET_HEADER_SIZE + 1) : 0,
        airTemperature: canRead(PACKET_HEADER_SIZE + 2, 1) ? buffer.readInt8(PACKET_HEADER_SIZE + 2) : 0,
        totalLaps: canRead(PACKET_HEADER_SIZE + 3, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 3) : 0,
        trackLength: canRead(PACKET_HEADER_SIZE + 4, 2) ? buffer.readUInt16LE(PACKET_HEADER_SIZE + 4) : 0,
        sessionType: canRead(PACKET_HEADER_SIZE + 6, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 6) : 0,
        trackId: canRead(PACKET_HEADER_SIZE + 7, 1) ? buffer.readInt8(PACKET_HEADER_SIZE + 7) : -1,
        formula: canRead(PACKET_HEADER_SIZE + 8, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 8) : 0,
        sessionTimeLeft: canRead(PACKET_HEADER_SIZE + 9, 2) ? buffer.readUInt16LE(PACKET_HEADER_SIZE + 9) : 0,
        sessionDuration: canRead(PACKET_HEADER_SIZE + 11, 2) ? buffer.readUInt16LE(PACKET_HEADER_SIZE + 11) : 0,
        pitSpeedLimit: canRead(PACKET_HEADER_SIZE + 13, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 13) : 0,
        gamePaused: canRead(PACKET_HEADER_SIZE + 14, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 14) : 0,
        isSpectating: canRead(PACKET_HEADER_SIZE + 15, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 15) : 0,
        spectatorCarIndex: canRead(PACKET_HEADER_SIZE + 16, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 16) : 0,
        sliProNativeSupport: canRead(PACKET_HEADER_SIZE + 17, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 17) : 0,
        numMarshalZones: marshalZones.length,
        marshalZones,
        safetyCarStatus: canRead(PACKET_HEADER_SIZE + 127, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 127) : 0,
        networkGame: canRead(PACKET_HEADER_SIZE + 128, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 128) : 0,
        numWeatherForecastSamples: weatherForecastSamples.length,
        weatherForecastSamples,
        forecastAccuracy: canRead(PACKET_HEADER_SIZE + 583, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 583) : 0,
        aiDifficulty: canRead(PACKET_HEADER_SIZE + 584, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 584) : 0,
        seasonLinkIdentifier: canRead(PACKET_HEADER_SIZE + 585, 4) ? buffer.readUInt32LE(PACKET_HEADER_SIZE + 585) : 0,
        weekendLinkIdentifier: canRead(PACKET_HEADER_SIZE + 589, 4) ? buffer.readUInt32LE(PACKET_HEADER_SIZE + 589) : 0,
        sessionLinkIdentifier: canRead(PACKET_HEADER_SIZE + 593, 4) ? buffer.readUInt32LE(PACKET_HEADER_SIZE + 593) : 0,
        pitStopWindowIdealLap: canRead(PACKET_HEADER_SIZE + 597, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 597) : 0,
        pitStopWindowLatestLap: canRead(PACKET_HEADER_SIZE + 598, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 598) : 0,
        pitStopRejoinPosition: canRead(PACKET_HEADER_SIZE + 599, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 599) : 0,
        steeringAssist: canRead(PACKET_HEADER_SIZE + 600, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 600) : 0,
        brakingAssist: canRead(PACKET_HEADER_SIZE + 601, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 601) : 0,
        gearboxAssist: canRead(PACKET_HEADER_SIZE + 602, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 602) : 0,
        pitAssist: canRead(PACKET_HEADER_SIZE + 603, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 603) : 0,
        pitReleaseAssist: canRead(PACKET_HEADER_SIZE + 604, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 604) : 0,
        ersAssist: canRead(PACKET_HEADER_SIZE + 605, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 605) : 0,
        drsAssist: canRead(PACKET_HEADER_SIZE + 606, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 606) : 0,
        dynamicRacingLine: canRead(PACKET_HEADER_SIZE + 607, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 607) : 0,
        dynamicRacingLineType: canRead(PACKET_HEADER_SIZE + 608, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 608) : 0,
        gameMode: canRead(PACKET_HEADER_SIZE + 609, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 609) : 0,
        ruleSet: canRead(PACKET_HEADER_SIZE + 610, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 610) : 0,
        timeOfDay: canRead(PACKET_HEADER_SIZE + 611, 4) ? buffer.readUInt32LE(PACKET_HEADER_SIZE + 611) : 0,
        sessionLength: canRead(PACKET_HEADER_SIZE + 615, 1) ? buffer.readUInt8(PACKET_HEADER_SIZE + 615) : 0,
    };
}

export const SESSION_TYPES: Record<number, string> = {
    0: 'UNKNOWN', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'SHORT_P', 5: 'Q1', 6: 'Q2', 7: 'Q3',
    8: 'SHORT_Q', 9: 'OSQ', 10: 'R', 11: 'R2', 12: 'R3', 13: 'TIME_TRIAL', 15: 'RACE_MODE_15'
};
