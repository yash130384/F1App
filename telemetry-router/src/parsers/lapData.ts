export interface LapData {
    lastLapTimeInMS: number;
    carPosition: number;
    currentLapNum: number;
    currentLapInvalid: boolean;
    gridPosition: number;
    resultStatus: number;
}

export function parseLapData(buffer: Buffer): LapData[] {
    const laps: LapData[] = [];

    // Header is 29 bytes.
    // 22 cars * 57 bytes per LapData = 1254 bytes.

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * 57);

        laps.push({
            lastLapTimeInMS: buffer.readUInt32LE(offset),
            carPosition: buffer.readUInt8(offset + 32),
            currentLapNum: buffer.readUInt8(offset + 33),
            currentLapInvalid: buffer.readUInt8(offset + 37) === 1,
            gridPosition: buffer.readUInt8(offset + 43),
            resultStatus: buffer.readUInt8(offset + 45)
        });
    }

    return laps;
}
