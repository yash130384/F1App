export interface CarTelemetryData {
    speedKmh: number;
    throttle: number;
    steer: number;
    brake: number;
    clutch: number;
    gear: number;
    engineRPM: number;
    drs: number;
    revLightsPercent: number;
    revLightsBitValue: number;
    brakesTemperature: number[];
    tyresSurfaceTemperature: number[];
    tyresInnerTemperature: number[];
    engineTemperature: number;
    tyresPressure: number[];
    surfaceType: number[];
}

export function parseTelemetry(buffer: Buffer): CarTelemetryData[] {
    const telemetry: CarTelemetryData[] = [];

    // Header is 29 bytes.
    // 22 cars * 60 bytes per CarTelemetryData = 1320 bytes.

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * 60);
        const brakesTemperature = [];
        const tyresSurfaceTemperature = [];
        const tyresInnerTemperature = [];
        const tyresPressure = [];
        const surfaceType = [];

        for (let j = 0; j < 4; j++) {
            brakesTemperature.push(buffer.readUInt16LE(offset + 22 + (j * 2)));
            tyresSurfaceTemperature.push(buffer.readUInt8(offset + 30 + j));
            tyresInnerTemperature.push(buffer.readUInt8(offset + 34 + j));
            tyresPressure.push(buffer.readFloatLE(offset + 40 + (j * 4)));
            surfaceType.push(buffer.readUInt8(offset + 56 + j));
        }

        telemetry.push({
            speedKmh: buffer.readUInt16LE(offset),
            throttle: buffer.readFloatLE(offset + 2),
            steer: buffer.readFloatLE(offset + 6),
            brake: buffer.readFloatLE(offset + 10),
            clutch: buffer.readUInt8(offset + 14),
            gear: buffer.readInt8(offset + 15),
            engineRPM: buffer.readUInt16LE(offset + 16),
            drs: buffer.readUInt8(offset + 18),
            revLightsPercent: buffer.readUInt8(offset + 19),
            revLightsBitValue: buffer.readUInt16LE(offset + 20),
            brakesTemperature,
            tyresSurfaceTemperature,
            tyresInnerTemperature,
            engineTemperature: buffer.readUInt16LE(offset + 38),
            tyresPressure,
            surfaceType
        });
    }

    return telemetry;
}
