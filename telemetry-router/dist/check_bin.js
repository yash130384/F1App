import fs from 'fs';
const filePath = 'c:/Users/der_b/Desktop/F1App/recordings/session_14668411044586209823_2026-03-11T20-14-35-318Z.bin';
function analyze() {
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    let offset = 0;
    let packetCount = 0;
    const packetTypes = new Map();
    console.log(`Analyzing ${filePath} (${stats.size} bytes)...`);
    while (offset < stats.size) {
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;
        const preamble = headerBuffer.readUInt32LE(0);
        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 3000) {
            console.log(`Stop at offset ${offset}: invalid length ${length}`);
            break;
        }
        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;
        if (length >= 24) {
            const packetId = packetBuffer.readUInt8(6);
            packetTypes.set(packetId, (packetTypes.get(packetId) || 0) + 1);
        }
        packetCount++;
        if (packetCount > 1000000)
            break; // limit
    }
    console.log(`Total Packets: ${packetCount}`);
    console.log('Packet Types:', Object.fromEntries(packetTypes));
    fs.closeSync(fd);
}
analyze();
