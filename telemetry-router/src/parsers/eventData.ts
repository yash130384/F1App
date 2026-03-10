export interface EventData {
    eventStringCode: string;
}

export function parseEventData(buffer: Buffer): EventData {
    const eventStringCode = buffer.toString('utf8', 29, 33);
    return { eventStringCode };
}
