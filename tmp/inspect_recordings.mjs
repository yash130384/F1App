import fs from 'fs';
import path from 'path';

function parseHeader(buffer) {
    return {
        packetId: buffer.readUInt8(24),
        sessionUID: buffer.readBigUInt64LE(8),
        playerCarIndex: buffer.readUInt8(25),
    };
}

function parseSession(buffer) {
    const trackId = buffer.readInt8(29);
    const sessionType = buffer.readUInt8(30);
    return { trackId, sessionType };
}

const recordingsDir = './recordings';
const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.bin'));

async function inspect() {
    for (const file of files) {
        const filePath = path.join(recordingsDir, file);
        const stats = fs.statSync(filePath);
        const fd = fs.openSync(filePath, 'r');
        
        let offset = 0;
        let trackId = -1;
        let sessionType = -1;
        let packetCount = 0;

        while (offset < Math.min(stats.size, 1000000)) { // Just check first few packets
            const headerBuffer = Buffer.alloc(6);
            fs.readSync(fd, headerBuffer, 0, 6, offset);
            const length = headerBuffer.readUInt16LE(4);
            if (length === 0) break;
            
            const packetBuffer = Buffer.alloc(length);
            fs.readSync(fd, packetBuffer, 0, length, offset + 6);
            
            const header = parseHeader(packetBuffer);
            if (header.packetId === 1) { // Session
                const s = parseSession(packetBuffer);
                trackId = s.trackId;
                sessionType = s.sessionType;
                break;
            }
            offset += 6 + length;
            packetCount++;
        }
        fs.closeSync(fd);
        console.log(`File: ${file} | TrackID: ${trackId} | SessionType: ${sessionType}`);
    }
}

inspect();
