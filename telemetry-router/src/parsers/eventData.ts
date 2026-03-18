export interface EventData {
    eventStringCode: string;
    // Only populated for SCAR events
    safetyCarType?: number;  // 0=none,1=full SC,2=virtual SC,3=formation lap SC
    eventType?: number;      // 0=deployed,1=returning,2=returned,3=resume race
}

export function parseEventData(buffer: Buffer): EventData {
    const eventStringCode = buffer.toString('utf8', 29, 33);

    const event: EventData = { eventStringCode };

    // Safety Car event: EventDataDetails.SafetyCar starts at byte 33
    if (eventStringCode === 'SCAR' && buffer.length >= 35) {
        event.safetyCarType = buffer.readUInt8(33);
        event.eventType = buffer.readUInt8(34);
    }

    return event;
}
