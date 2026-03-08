export interface SessionData {
    sessionTypeRaw: number;
    sessionTypeMapped: string;
    trackId: number;
    trackLength: number;
}

export function parseSession(buffer: Buffer): SessionData {
    // Header is 29 bytes.
    // m_weather (uint8) = 29
    // m_trackTemperature (int8) = 30
    // m_airTemperature (int8) = 31
    // m_totalLaps (uint8) = 32
    // m_trackLength (uint16) = 33
    // m_sessionType (uint8) = 35
    // m_trackId (int8) = 36

    const trackLength = buffer.readUInt16LE(33);
    const sessionTypeRaw = buffer.readUInt8(35);
    const trackId = buffer.readInt8(36);

    let sessionTypeMapped = "Unknown";
    if (sessionTypeRaw >= 1 && sessionTypeRaw <= 4) sessionTypeMapped = "Practice";
    else if (sessionTypeRaw >= 5 && sessionTypeRaw <= 9) sessionTypeMapped = "Qualifying";
    else if (sessionTypeRaw >= 10 && sessionTypeRaw <= 12) sessionTypeMapped = "Race";
    else if (sessionTypeRaw === 13) sessionTypeMapped = "Time Trial";

    return {
        sessionTypeRaw,
        sessionTypeMapped,
        trackId,
        trackLength
    };
}
