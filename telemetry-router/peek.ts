import fs from 'fs';

const filePath = 'c:\\Users\\der_b\\Desktop\\F1App\\recordings\\session_13101448679500257999_2026-04-01T18-29-25-384Z.bin';
const buffer = fs.readFileSync(filePath);

console.log('--- Peeking at BIN file (F1 25 Verification) ---');
console.log('Buffer total size:', buffer.length);

let offset = 0;
// First packet
const pktSize = buffer.readUInt32LE(offset); offset += 4;
console.log('First Packet Size:', pktSize);

// Header (starts right after the uint32le size)
const packet = buffer.subarray(offset, offset + pktSize);

const packetFormat = packet.readUInt16LE(0);
const gameMaj = packet.readUInt8(2);
const gameMin = packet.readUInt8(3);
const pktVer = packet.readUInt8(4);
const pktId = packet.readUInt8(5);
const sessionUID = packet.readBigUInt64LE(6);

console.log('Byte 0-1 (Format):', packetFormat);
console.log('Byte 2 (Maj):', gameMaj);
console.log('Byte 3 (Min):', gameMin);
console.log('Byte 4 (Ver):', pktVer);
console.log('Byte 5 (ID):', pktId);
console.log('Byte 6-13 (UID):', sessionUID.toString());

if (pktId === 1) {
    // Session Packet
    console.log('Detected Session Packet at start.');
    console.log('Byte 28 (Weather):', packet.readUInt8(28));
    console.log('Byte 34 (SessionTypeRaw):', packet.readUInt8(34));
} else {
	console.log('Packet ID is not 1, but we can verify offsets.');
}

console.log('------------------------------------------------');
