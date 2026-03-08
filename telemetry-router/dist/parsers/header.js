"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHeader = parseHeader;
function parseHeader(buffer) {
    return {
        packetFormat: buffer.readUInt16LE(0),
        gameYear: buffer.readUInt8(2),
        gameMajorVersion: buffer.readUInt8(3),
        gameMinorVersion: buffer.readUInt8(4),
        packetVersion: buffer.readUInt8(5),
        packetId: buffer.readUInt8(6),
        sessionUID: buffer.readBigUInt64LE(7),
        sessionTime: buffer.readFloatLE(15),
        frameIdentifier: buffer.readUInt32LE(19),
        overallFrameIdentifier: buffer.readUInt32LE(23),
        playerCarIndex: buffer.readUInt8(27),
        secondaryPlayerCarIndex: buffer.readUInt8(28)
    };
}
