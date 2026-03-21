export interface EventData {
    eventStringCode: string;
    // Only populated for SCAR events
    safetyCarType?: number;  // 0=none,1=full SC,2=virtual SC,3=formation lap SC
    eventType?: number;      // 0=deployed,1=returning,2=returned,3=resume race
    // Penalty
    vehicleIdx?: number;
    penaltyType?: number;
    infringementType?: number;
    otherVehicleIdx?: number;
    time?: number;
    lapNum?: number;
    // Collision
    vehicle1Idx?: number;
    vehicle2Idx?: number;
    // Overtake
    overtakingVehicleIdx?: number;
    beingOvertakenVehicleIdx?: number;
}

export function parseEventData(buffer: Buffer): EventData {
    const eventStringCode = buffer.toString('utf8', 29, 33);
    const event: EventData = { eventStringCode };

    // Safety Car event
    if (eventStringCode === 'SCAR' && buffer.length >= 35) {
        event.safetyCarType = buffer.readUInt8(33);
        event.eventType = buffer.readUInt8(34);
    } 
    // Penalty event
    else if (eventStringCode === 'PENA') {
        event.penaltyType = buffer.readUInt8(33);
        event.infringementType = buffer.readUInt8(34);
        event.vehicleIdx = buffer.readUInt8(35);
        event.otherVehicleIdx = buffer.readUInt8(36);
        event.time = buffer.readUInt8(37);
        event.lapNum = buffer.readUInt8(38);
    }
    // Collision event
    else if (eventStringCode === 'COLL') {
        event.vehicle1Idx = buffer.readUInt8(33);
        event.vehicle2Idx = buffer.readUInt8(34);
    }
    // Overtake event
    else if (eventStringCode === 'OVTK') {
        event.overtakingVehicleIdx = buffer.readUInt8(33);
        event.beingOvertakenVehicleIdx = buffer.readUInt8(34);
    }

    return event;
}
