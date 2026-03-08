export interface CarTelemetryData {
    speedKmh: number;
}

export function parseTelemetry(buffer: Buffer): CarTelemetryData[] {
    const telemetry: CarTelemetryData[] = [];

    // Header is 29 bytes.
    // 22 cars * 60 bytes per CarTelemetryData = 1320 bytes.

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * 60);
        telemetry.push({
            speedKmh: buffer.readUInt16LE(offset)
        });
    }

    return telemetry;
}
