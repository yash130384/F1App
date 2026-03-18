"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEventData = parseEventData;
function parseEventData(buffer) {
    const eventStringCode = buffer.toString('utf8', 29, 33);
    const event = { eventStringCode };
    // Safety Car event: EventDataDetails.SafetyCar starts at byte 33
    if (eventStringCode === 'SCAR' && buffer.length >= 35) {
        event.safetyCarType = buffer.readUInt8(33);
        event.eventType = buffer.readUInt8(34);
    }
    return event;
}
