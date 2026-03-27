"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const header_1 = require("./header");
(0, vitest_1.describe)('Header Parser', () => {
    (0, vitest_1.it)('should correctly parse a binary header (F1 2024 format)', () => {
        const buffer = Buffer.alloc(29);
        buffer.writeUInt16LE(2024, 0); // packetFormat
        buffer.writeUInt8(24, 2); // gameYear
        buffer.writeUInt8(1, 3); // gameMajorVersion
        buffer.writeUInt8(5, 4); // gameMinorVersion
        buffer.writeUInt8(1, 5); // packetVersion
        buffer.writeUInt8(0, 6); // packetId (Motion)
        buffer.writeBigUInt64LE(1234567890n, 7); // sessionUID
        buffer.writeFloatLE(100.5, 15); // sessionTime
        buffer.writeUInt32LE(1000, 19); // frameIdentifier
        buffer.writeUInt32LE(2000, 23); // overallFrameIdentifier
        buffer.writeUInt8(10, 27); // playerCarIndex
        buffer.writeUInt8(255, 28); // secondaryPlayerCarIndex
        const header = (0, header_1.parseHeader)(buffer);
        (0, vitest_1.expect)(header.packetFormat).toBe(2024);
        (0, vitest_1.expect)(header.gameYear).toBe(24);
        (0, vitest_1.expect)(header.gameMajorVersion).toBe(1);
        (0, vitest_1.expect)(header.gameMinorVersion).toBe(5);
        (0, vitest_1.expect)(header.packetVersion).toBe(1);
        (0, vitest_1.expect)(header.packetId).toBe(0);
        (0, vitest_1.expect)(header.sessionUID).toBe(1234567890n);
        (0, vitest_1.expect)(header.sessionTime).toBeCloseTo(100.5);
        (0, vitest_1.expect)(header.frameIdentifier).toBe(1000);
        (0, vitest_1.expect)(header.overallFrameIdentifier).toBe(2000);
        (0, vitest_1.expect)(header.playerCarIndex).toBe(10);
        (0, vitest_1.expect)(header.secondaryPlayerCarIndex).toBe(255);
    });
});
