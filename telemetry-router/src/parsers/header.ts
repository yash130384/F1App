export const PACKET_HEADER_SIZE = 29;

export interface PacketHeader {
    packetFormat: number;           // 2025
    gameYear: number;               // 25
    gameMajorVersion: number;       // Game major version - "X.00"
    gameMinorVersion: number;       // Game minor version - "1.XX"
    packetVersion: number;          // Version of this packet type, all start from 1
    packetId: number;               // Identifier for the packet type
    sessionUID: bigint;             // Unique identifier for the session
    sessionTime: number;            // Session time in seconds
    frameIdentifier: number;        // Identifier for the frame
    overallFrameIdentifier: number; // Overall frame identifier
    playerCarIndex: number;         // Index of player's car
    secondaryPlayerCarIndex: number; // Index of secondary player's car
}

export function parseHeader(buffer: Buffer): PacketHeader {
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
