"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEventData = parseEventData;
function parseEventData(buffer) {
    const eventStringCode = buffer.toString('utf8', 29, 33);
    const event = { eventStringCode };
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
    // Retirement event
    else if (eventStringCode === 'RTMT') {
        event.vehicleIdx = buffer.readUInt8(33);
        event.retirementReason = buffer.readUInt8(34);
    }
    // Speed Trap event
    else if (eventStringCode === 'SPTP') {
        event.vehicleIdx = buffer.readUInt8(33);
        event.speed = buffer.readFloatLE(34);
        event.isOverallFastestInSession = buffer.readUInt8(38);
        event.isDriverFastestInSession = buffer.readUInt8(39);
        event.fastestVehicleIdxInSession = buffer.readUInt8(40);
        event.fastestSpeedInSession = buffer.readFloatLE(41);
    }
    return event;
}
