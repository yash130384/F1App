export function parseLapData(buffer) {
    const laps = [];
    // Header is 29 bytes.
    // 22 cars * 57 bytes per LapData = 1254 bytes.
    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * 57);
        laps.push({
            lastLapTimeInMS: buffer.readUInt32LE(offset),
            currentLapTimeInMS: buffer.readUInt32LE(offset + 4),
            sector1TimeMSPart: buffer.readUInt16LE(offset + 8),
            sector1TimeMinutesPart: buffer.readUInt8(offset + 10),
            sector2TimeMSPart: buffer.readUInt16LE(offset + 11),
            sector2TimeMinutesPart: buffer.readUInt8(offset + 13),
            deltaToCarInFrontMSPart: buffer.readUInt16LE(offset + 14),
            deltaToCarInFrontMinutesPart: buffer.readUInt8(offset + 16),
            deltaToRaceLeaderMSPart: buffer.readUInt16LE(offset + 17),
            deltaToRaceLeaderMinutesPart: buffer.readUInt8(offset + 19),
            lapDistance: buffer.readFloatLE(offset + 20),
            totalDistance: buffer.readFloatLE(offset + 24),
            safetyCarDelta: buffer.readFloatLE(offset + 28),
            carPosition: buffer.readUInt8(offset + 32),
            currentLapNum: buffer.readUInt8(offset + 33),
            pitStatus: buffer.readUInt8(offset + 34),
            numPitStops: buffer.readUInt8(offset + 35),
            sector: buffer.readUInt8(offset + 36),
            currentLapInvalid: buffer.readUInt8(offset + 37) === 1,
            penalties: buffer.readUInt8(offset + 38),
            totalWarnings: buffer.readUInt8(offset + 39),
            cornerCuttingWarnings: buffer.readUInt8(offset + 40),
            numUnservedDriveThroughPens: buffer.readUInt8(offset + 41),
            numUnservedStopGoPens: buffer.readUInt8(offset + 42),
            gridPosition: buffer.readUInt8(offset + 43),
            driverStatus: buffer.readUInt8(offset + 44),
            resultStatus: buffer.readUInt8(offset + 45),
            pitLaneTimerActive: buffer.readUInt8(offset + 46),
            pitLaneTimeInLaneInMS: buffer.readUInt16LE(offset + 47),
            pitStopTimerInMS: buffer.readUInt16LE(offset + 49),
            pitStopShouldServePen: buffer.readUInt8(offset + 51),
            speedTrapFastestSpeed: buffer.readFloatLE(offset + 52),
            speedTrapFastestLap: buffer.readUInt8(offset + 56),
        });
    }
    return laps;
}
