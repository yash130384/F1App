export interface CarStatusData {
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    vehicleFIAFlags: number;
}

export function parseCarStatus(buffer: Buffer): CarStatusData[] {
    const statuses: CarStatusData[] = [];

    // Header is 29 bytes.
    // 22 cars * 55 bytes/carStatus = 1210 bytes.

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * 55);

        statuses.push({
            actualTyreCompound: buffer.readUInt8(offset + 25),
            visualTyreCompound: buffer.readUInt8(offset + 26),
            tyresAgeLaps: buffer.readUInt8(offset + 27),
            vehicleFIAFlags: buffer.readInt8(offset + 28)
        });
    }

    return statuses;
}
