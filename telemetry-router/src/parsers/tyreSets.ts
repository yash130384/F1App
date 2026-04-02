import { PACKET_HEADER_SIZE } from './header';

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
    const carIdx = buffer.readUInt8(PACKET_HEADER_SIZE);
    const tyreSetData: TyreSetData[] = [];

    // F1 25 TyreSetData size is 10 bytes
    const setSize = 10; 

    // cs_maxNumTyreSets is 20
    for (let i = 0; i < 20; i++) {
        const offset = PACKET_HEADER_SIZE + 1 + (i * setSize);
        if (offset + setSize > buffer.length) break;

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

    const fittedIdxOffset = PACKET_HEADER_SIZE + 1 + (20 * setSize);
    const fittedIdx = (fittedIdxOffset < buffer.length) ? buffer.readUInt8(fittedIdxOffset) : 0;

    return {
        carIdx,
        tyreSetData,
        fittedIdx
    };
}
