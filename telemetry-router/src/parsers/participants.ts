import { PACKET_HEADER_SIZE } from './header';

export interface ParticipantData {
    aiControlled: number;
    driverId: number;
    networkId: number;
    teamId: number;
    myTeam: number;
    raceNumber: number;
    nationality: number;
    name: string;
    yourTelemetry: number;
    showOnlineNames: number;
    platform: number;
}

export interface PacketParticipantsData {
    numActiveCars: number;
    participants: ParticipantData[];
}

export function parseParticipants(buffer: Buffer): PacketParticipantsData {
    // F1 25: Header ist 29 Bytes
    const numActiveCars = buffer.readUInt8(PACKET_HEADER_SIZE);
    const participants: ParticipantData[] = [];
    
    // F1 25 Teilnehmer-Stride: 60 Bytes
    const participantStride = 60;

    for (let i = 0; i < 22; i++) {
        const offset = PACKET_HEADER_SIZE + 1 + i * participantStride;
        if (offset + participantStride > buffer.length) break;

        participants.push({
            aiControlled: buffer.readUInt8(offset),
            driverId: buffer.readUInt8(offset + 1),
            networkId: buffer.readUInt8(offset + 2),
            teamId: buffer.readUInt8(offset + 3),
            myTeam: buffer.readUInt8(offset + 4),
            raceNumber: buffer.readUInt8(offset + 5),
            nationality: buffer.readUInt8(offset + 6),
            name: buffer.toString('utf8', offset + 7, offset + 7 + 48).replace(/\0/g, '').trim(),
            yourTelemetry: buffer.readUInt8(offset + 55),
            showOnlineNames: buffer.readUInt8(offset + 56),
            platform: buffer.readUInt8(offset + 57),
        });
    }

    return {
        numActiveCars,
        participants,
    };
}
