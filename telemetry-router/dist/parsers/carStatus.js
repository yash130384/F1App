"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCarStatus = parseCarStatus;
function parseCarStatus(buffer) {
    const statuses = [];
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
