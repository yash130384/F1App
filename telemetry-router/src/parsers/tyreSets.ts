export interface TyreSetData {
    actualTyreCompound: number;
    visualTyreCompound: number;
    wear: number;
    available: number;
    recommendedSession: number;
    lifeSpan: number;
    usableLife: number;
    lapDeltaTime: number;
    fitted: number;
}

export interface PacketTyreSetsData {
    carIdx: number;
    tyreSetData: TyreSetData[];
    fittedIdx: number;
}

export function parseTyreSets(buffer: Buffer): PacketTyreSetsData {
    const headerSize = 29;
    const carIdx = buffer.readUInt8(headerSize);
    const tyreSetData: TyreSetData[] = [];

    // F1 24 (ID 12) = 231 Bytes, F1 25 (ID 20) = ?
    // Wir bestimmen den Multiplikator anhand der Buffer-Länge
    const setSize = buffer.length >= 251 ? 11 : 10; 

    // cs_maxNumTyreSets is 20
    for (let i = 0; i < 20; i++) {
        const offset = (headerSize + 1) + (i * setSize);
        if (offset + 10 > buffer.length) break;

        tyreSetData.push({
            actualTyreCompound: buffer.readUInt8(offset),
            visualTyreCompound: buffer.readUInt8(offset + 1),
            wear: buffer.readUInt8(offset + 2),
            available: buffer.readUInt8(offset + 3),
            recommendedSession: buffer.readUInt8(offset + 4),
            lifeSpan: buffer.readUInt8(offset + 5),
            usableLife: buffer.readUInt8(offset + 6),
            lapDeltaTime: buffer.readInt16LE(offset + 7),
            fitted: buffer.readUInt8(offset + 9)
        });
    }

    // fittedIdx ist das letzte Byte
    const fittedIdxOffset = (headerSize + 1) + (20 * setSize);
    const fittedIdx = (fittedIdxOffset < buffer.length) ? buffer.readUInt8(fittedIdxOffset) : 0;

    return {
        carIdx,
        tyreSetData,
        fittedIdx
    };
}
