import { PACKET_HEADER_SIZE } from './header';

export interface LapData {
    lastLapTimeInMS: number;
    currentLapTimeInMS: number;
    sector1TimeInMS: number;
    sector1TimeMinutes: number;
    sector2TimeInMS: number;
    sector2TimeMinutes: number;
    deltaToCarInFrontInMS: number;
    deltaToBestInSessionInMS: number;
    lapDistance: number;
    totalDistance: number;
    safetyCarDelta: number;
    carPosition: number;
    currentLapNum: number;
    pitStatus: number;
    numPitStops: number;
    sector: number;
    currentLapInvalid: number;
    penalties: number;
    totalWarnings: number;
    cornerCuttingWarnings: number;
    numUnservedDriveThroughPens: number;
    numUnservedStopGoPens: number;
    gridPosition: number;
    driverStatus: number;
    resultStatus: number;
    pitLaneTimerActive: number;
    pitLaneTimeInLaneInMS: number;
    pitStopTimerInMS: number;
    pitStopShouldServePen: number;
}

export function parseLapData(buffer: Buffer): LapData[] {
    const laps: LapData[] = [];
    const stride = 113; // F1 25 Stride

    for (let i = 0; i < 22; i++) {
        const offset = PACKET_HEADER_SIZE + (i * stride);
        if (offset + stride > buffer.length) break;

        laps.push({
            lastLapTimeInMS: buffer.readUInt32LE(offset),
            currentLapTimeInMS: buffer.readUInt32LE(offset + 4),
            sector1TimeInMS: buffer.readUInt16LE(offset + 8),
            sector1TimeMinutes: buffer.readUInt8(offset + 10),
            sector2TimeInMS: buffer.readUInt16LE(offset + 11),
            sector2TimeMinutes: buffer.readUInt8(offset + 13),
            deltaToCarInFrontInMS: buffer.readUInt16LE(offset + 14),
            deltaToBestInSessionInMS: buffer.readUInt16LE(offset + 16),
            lapDistance: buffer.readFloatLE(offset + 18),
            totalDistance: buffer.readFloatLE(offset + 22),
            safetyCarDelta: buffer.readFloatLE(offset + 26),
            carPosition: buffer.readUInt8(offset + 30),
            currentLapNum: buffer.readUInt8(offset + 31),
            pitStatus: buffer.readUInt8(offset + 32),
            numPitStops: buffer.readUInt8(offset + 33),
            sector: buffer.readUInt8(offset + 34),
            currentLapInvalid: buffer.readUInt8(offset + 35),
            penalties: buffer.readUInt8(offset + 36),
            totalWarnings: buffer.readUInt8(offset + 37),
            cornerCuttingWarnings: buffer.readUInt8(offset + 38),
            numUnservedDriveThroughPens: buffer.readUInt8(offset + 39),
            numUnservedStopGoPens: buffer.readUInt8(offset + 40),
            gridPosition: buffer.readUInt8(offset + 41),
            driverStatus: buffer.readUInt8(offset + 42),
            resultStatus: buffer.readUInt8(offset + 43),
            pitLaneTimerActive: buffer.readUInt8(offset + 44),
            pitLaneTimeInLaneInMS: buffer.readUInt16LE(offset + 45),
            pitStopTimerInMS: buffer.readUInt16LE(offset + 47),
            pitStopShouldServePen: buffer.readUInt8(offset + 49),
            // + weitere Felder in F1 25 bis 113 Bytes
        });
    }
    return laps;
}
