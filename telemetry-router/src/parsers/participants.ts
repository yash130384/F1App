export interface ParticipantData {
    aiControlled: number;
    teamId: number;
    nationality: number;
    name: string;
    isHuman: boolean;
}

export function parseParticipants(buffer: Buffer): ParticipantData[] {
    const participants: ParticipantData[] = [];
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

        participants.push({
            aiControlled,
            teamId,
            nationality,
            name,
            isHuman: aiControlled === 0
        });
    }

    return participants;
}
