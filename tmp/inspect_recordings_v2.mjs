import fs from 'fs';
import path from 'path';

function parseHeader(buffer) {
    if (buffer.length < 29) return null;
    return {
        packetFormat: buffer.readUInt16LE(0),
        packetId: buffer.readUInt8(6),
        sessionUID: buffer.readBigUInt64LE(7),
        playerCarIndex: buffer.readUInt8(27),
    };
}

function parseSession(buffer) {
    // F1 24/25 Header is 29 bytes
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

        // Scan the first 50MB for session packet
        while (offset < Math.min(stats.size, 50 * 1024 * 1024)) {
            const headerBuffer = Buffer.alloc(6);
            if (fs.readSync(fd, headerBuffer, 0, 6, offset) < 6) break;
            const length = headerBuffer.readUInt16LE(4);
            if (length === 0 || length > 2000) {
               offset += 6;
               continue;
            }
            
            const packetBuffer = Buffer.alloc(length);
            fs.readSync(fd, packetBuffer, 0, length, offset + 6);
            
            const header = parseHeader(packetBuffer);
            if (header && header.packetId === 1) { // Session
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
