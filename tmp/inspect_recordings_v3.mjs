import fs from 'fs';
import path from 'path';

function parseHeader(buffer) {
    if (buffer.length < 29) return null;
    return {
        packetFormat: buffer.readUInt16LE(0),
        packetId: buffer.readUInt8(6),
        sessionUID: buffer.readBigUInt64LE(7),
    };
}

function parseSession(buffer) {
    const sessionTypeRaw = buffer.readUInt8(35);
    const trackId = buffer.readInt8(36);
    return { trackId, sessionTypeRaw };
}

const TRACK_MAP = {
    0: 'Melbourne', 1: 'Paul Ricard', 2: 'Shanghai', 3: 'Sakhir (Bahrain)',
    4: 'Catalunya', 5: 'Monaco', 6: 'Montreal', 7: 'Silverstone',
    10: 'Spa', 13: 'Suzuka', 16: 'Brazil', 26: 'Zandvoort', 
    30: 'Miami', 31: 'Las Vegas'
};

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

        while (offset < Math.min(stats.size, 50 * 1024 * 1024)) {
            const headerBuffer = Buffer.alloc(6);
            if (fs.readSync(fd, headerBuffer, 0, 6, offset) < 6) break;
            const length = headerBuffer.readUInt16LE(4);
            if (length === 0) break;
            
            const packetBuffer = Buffer.alloc(length);
            fs.readSync(fd, packetBuffer, 0, length, offset + 6);
            
            const header = parseHeader(packetBuffer);
            if (header && header.packetId === 1) { // Session
                const s = parseSession(packetBuffer);
                trackId = s.trackId;
                sessionType = s.sessionTypeRaw;
                break;
            }
            offset += 6 + length;
        }
        fs.closeSync(fd);
        console.log(`File: ${file} | Track: ${TRACK_MAP[trackId] || trackId} | SessionType: ${sessionType}`);
    }
}

inspect();
