import { PACKET_HEADER_SIZE } from './header';

export interface CarTelemetryData {
    speed: number;
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

export function parseCarTelemetry(buffer: Buffer): CarTelemetryData[] {
    const carTelemetryData: CarTelemetryData[] = [];
    const stride = 60; // F1 25 Stride

    for (let i = 0; i < 22; i++) {
        const offset = PACKET_HEADER_SIZE + (i * stride);
        if (offset + stride > buffer.length) break;

        carTelemetryData.push({
            speed: buffer.readUInt16LE(offset),
            throttle: buffer.readFloatLE(offset + 2),
            steer: buffer.readFloatLE(offset + 6),
            brake: buffer.readFloatLE(offset + 10),
            clutch: buffer.readUInt8(offset + 14),
            gear: buffer.readInt8(offset + 15),
            engineRPM: buffer.readUInt16LE(offset + 16),
            drs: buffer.readUInt8(offset + 18),
            revLightsPercent: buffer.readUInt8(offset + 19),
            revLightsBitValue: buffer.readUInt16LE(offset + 20),
            brakesTemperature: [
                buffer.readUInt16LE(offset + 22),
                buffer.readUInt16LE(offset + 24),
                buffer.readUInt16LE(offset + 26),
                buffer.readUInt16LE(offset + 28),
            ],
            tyresSurfaceTemperature: [
                buffer.readUInt8(offset + 30),
                buffer.readUInt8(offset + 31),
                buffer.readUInt8(offset + 32),
                buffer.readUInt8(offset + 33),
            ],
            tyresInnerTemperature: [
                buffer.readUInt8(offset + 34),
                buffer.readUInt8(offset + 35),
                buffer.readUInt8(offset + 36),
                buffer.readUInt8(offset + 37),
            ],
            engineTemperature: buffer.readUInt16LE(offset + 38),
            tyresPressure: [
                buffer.readFloatLE(offset + 40),
                buffer.readFloatLE(offset + 44),
                buffer.readFloatLE(offset + 48),
                buffer.readFloatLE(offset + 52),
            ],
            surfaceType: [
                buffer.readUInt8(offset + 56),
                buffer.readUInt8(offset + 57),
                buffer.readUInt8(offset + 58),
                buffer.readUInt8(offset + 59),
            ],
        });
    }

    return carTelemetryData;
}
