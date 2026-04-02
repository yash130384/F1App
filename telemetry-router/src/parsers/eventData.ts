import { PACKET_HEADER_SIZE } from './header';

export interface EventData {
    eventStringCode: string;
    vehicleIdx?: number;
    lapNum?: number;
    time?: number;
    penaltyType?: number;
    infringementType?: number;
    otherVehicleIdx?: number;
    placesGained?: number;
    speed?: number;
    isOverallFastestInSession?: number;
    isDriverFastestInSession?: number;
    fastestVehicleIdxInSession?: number;
    flightByNight?: number;
    flashbackFrameIdentifier?: number;
    flashbackSessionTime?: number;
    numLights?: number;
    retirementReason?: number;
    vehicle1Idx?: number; // For Collision
    vehicle2Idx?: number; // For Collision
}

export function parseEventData(buffer: Buffer): EventData {
    const eventStringCode = buffer.toString('utf8', PACKET_HEADER_SIZE, PACKET_HEADER_SIZE + 4);
    const result: EventData = { eventStringCode };

    const offset = PACKET_HEADER_SIZE + 4;

    switch (eventStringCode) {
        case 'FTLP': // Fastest Lap
            result.vehicleIdx = buffer.readUInt8(offset);
            result.time = buffer.readFloatLE(offset + 1);
            break;
        case 'RTMT': // Retirement
            result.vehicleIdx = buffer.readUInt8(offset);
            // Retirement reason (F1 25 hat hier evtl. ein Byte mehr)
            if (buffer.length > offset + 1) {
                result.retirementReason = buffer.readUInt8(offset + 1);
            }
            break;
        case 'TMPT': // Team Mate Pitted
            result.vehicleIdx = buffer.readUInt8(offset);
            break;
        case 'RCWN': // Race Winner
            result.vehicleIdx = buffer.readUInt8(offset);
            break;
        case 'PENA': // Penalty
            result.penaltyType = buffer.readUInt8(offset);
            result.infringementType = buffer.readUInt8(offset + 1);
            result.vehicleIdx = buffer.readUInt8(offset + 2);
            result.otherVehicleIdx = buffer.readUInt8(offset + 3);
            result.time = buffer.readUInt8(offset + 4);
            result.lapNum = buffer.readUInt8(offset + 5);
            result.placesGained = buffer.readUInt8(offset + 6);
            break;
        case 'SPTP': // Speed Trap
            result.vehicleIdx = buffer.readUInt8(offset);
            result.speed = buffer.readFloatLE(offset + 1);
            result.isOverallFastestInSession = buffer.readUInt8(offset + 5);
            result.isDriverFastestInSession = buffer.readUInt8(offset + 6);
            result.fastestVehicleIdxInSession = buffer.readUInt8(offset + 7);
            break;
        case 'FLBK': // Flashback
            result.flashbackFrameIdentifier = buffer.readUInt32LE(offset);
            result.flashbackSessionTime = buffer.readFloatLE(offset + 4);
            break;
        case 'STGS': // Start Lights
            result.numLights = buffer.readUInt8(offset);
            break;
        case 'COLL': // Collision
            result.vehicle1Idx = buffer.readUInt8(offset);
            result.vehicle2Idx = buffer.readUInt8(offset + 1);
            break;
    }

    return result;
}
