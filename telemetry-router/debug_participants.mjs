import fs from 'fs';
import path from 'path';
import { parseHeader, PACKET_HEADER_SIZE } from './src/parsers/header.js';

const filePath = 'recordings/session_5769514346206971857_2026-04-01T19-26-54-358Z.bin';

function parseBinFile() {
    const buffer = fs.readFileSync(filePath);
    let offset = 0;

    while (offset < buffer.length) {
        // Read 6-byte header: 4 bytes length, 2 bytes packet length
        if (offset + 6 > buffer.length) break;
        const packetLength = buffer.readUInt32LE(offset);
        const actualLength = buffer.readUInt16LE(offset + 4);
        offset += 6;

        if (offset + actualLength > buffer.length) break;

        const packet = buffer.subarray(offset, offset + actualLength);
        offset += actualLength;

        // Parse header
        if (packet.length < PACKET_HEADER_SIZE) continue;
        const header = parseHeader(packet);

        if (header.packetId === 4) { // Participants
            console.log('Found Participants Packet:');
            console.log('Packet length:', packet.length);
            console.log('Header:', header);

            const numActiveCars = packet.readUInt8(PACKET_HEADER_SIZE);
            console.log('Num active cars:', numActiveCars);

            const participantStride = 60; // As per comment
            for (let i = 0; i < Math.min(numActiveCars, 5); i++) { // First 5
                const pOffset = PACKET_HEADER_SIZE + 1 + i * participantStride;
                console.log(`\nParticipant ${i}:`);
                console.log('Raw bytes from offset', pOffset, 'to', pOffset + 60);
                const raw = packet.subarray(pOffset, pOffset + 60);
                console.log(raw.toString('hex'));

                // Parse fields
                const aiControlled = packet.readUInt8(pOffset);
                const driverId = packet.readUInt8(pOffset + 1);
                const networkId = packet.readUInt8(pOffset + 2);
                const teamId = packet.readUInt8(pOffset + 3);
                const myTeam = packet.readUInt8(pOffset + 4);
                const raceNumber = packet.readUInt8(pOffset + 5);
                const nationality = packet.readUInt8(pOffset + 6);
                const name = packet.toString('utf8', pOffset + 7, pOffset + 7 + 32).replace(/\0/g, '').trim();
                const yourTelemetry = packet.readUInt8(pOffset + 39);
                const showOnlineNames = packet.readUInt8(pOffset + 40);
                const techLevel = packet.readUInt16LE(pOffset + 41);
                const platform = packet.readUInt8(pOffset + 43);
                const numColours = packet.readUInt8(pOffset + 44);

                console.log('aiControlled:', aiControlled);
                console.log('driverId:', driverId);
                console.log('networkId:', networkId);
                console.log('teamId:', teamId);
                console.log('myTeam:', myTeam);
                console.log('raceNumber:', raceNumber);
                console.log('nationality:', nationality);
                console.log('name:', name);
                console.log('yourTelemetry:', yourTelemetry);
                console.log('showOnlineNames:', showOnlineNames);
                console.log('techLevel:', techLevel);
                console.log('platform:', platform);
                console.log('numColours:', numColours);
            }
            break; // Only first one
        }
    }
}

parseBinFile();
