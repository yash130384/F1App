"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParticipants = parseParticipants;
function parseParticipants(buffer) {
    const participants = [];
    const numActiveCars = buffer.readUInt8(29);
    for (let i = 0; i < numActiveCars; i++) {
        const offset = 30 + (i * 57);
        const aiControlled = buffer.readUInt8(offset);
        const teamId = buffer.readUInt8(offset + 3);
        const nationality = buffer.readUInt8(offset + 6);
        let nameBuffer = buffer.subarray(offset + 7, offset + 39);
        // Null-terminated string, find first 0x00
        const nullIdx = nameBuffer.indexOf(0x00);
        if (nullIdx !== -1) {
            nameBuffer = nameBuffer.subarray(0, nullIdx);
        }
        const name = nameBuffer.toString('utf-8');
        const liveryColours = [];
        for (let j = 0; j < 4; j++) {
            const colourOffset = offset + 45 + (j * 3);
            liveryColours.push({
                red: buffer.readUInt8(colourOffset),
                green: buffer.readUInt8(colourOffset + 1),
                blue: buffer.readUInt8(colourOffset + 2)
            });
        }
        participants.push({
            aiControlled,
            driverId: buffer.readUInt8(offset + 1),
            networkId: buffer.readUInt8(offset + 2),
            teamId,
            myTeam: buffer.readUInt8(offset + 4),
            raceNumber: buffer.readUInt8(offset + 5),
            nationality,
            name,
            yourTelemetry: buffer.readUInt8(offset + 39),
            showOnlineNames: buffer.readUInt8(offset + 40),
            techLevel: buffer.readUInt16LE(offset + 41),
            platform: buffer.readUInt8(offset + 43),
            numColours: buffer.readUInt8(offset + 44),
            liveryColours,
            isHuman: aiControlled === 0
        });
    }
    return participants;
}
