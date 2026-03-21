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
    const carIdx = buffer.readUInt8(29);
    const tyreSetData: TyreSetData[] = [];

    // cs_maxNumTyreSets is 20
    for (let i = 0; i < 20; i++) {
        const offset = 30 + (i * 11);
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

    const fittedIdx = buffer.readUInt8(30 + (20 * 11));

    return {
        carIdx,
        tyreSetData,
        fittedIdx
    };
}
