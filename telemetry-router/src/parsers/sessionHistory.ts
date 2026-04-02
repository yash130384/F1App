import { PACKET_HEADER_SIZE } from './header';

export interface LapHistoryData {
    lapTimeInMS: number;
    sector1TimeInMS: number;
    sector1TimeMinutes: number;
    sector2TimeInMS: number;
    sector2TimeMinutes: number;
    sector3TimeInMS: number;
    sector3TimeMinutes: number;
    lapValidBitFlags: number;
}

export interface TyreStintHistoryData {
    endLap: number;
    tyreActualCompound: number;
    tyreVisualCompound: number;
}

export interface PacketSessionHistoryData {
    carIdx: number;
    numLaps: number;
    numTyreStints: number;
    bestLapTimeLapNum: number;
    bestSector1LapNum: number;
    bestSector2LapNum: number;
    bestSector3LapNum: number;
    lapHistoryData: LapHistoryData[];
    tyreStintHistoryData: TyreStintHistoryData[];
}

export function parseSessionHistory(buffer: Buffer): PacketSessionHistoryData {
    const carIdx = buffer.readUInt8(PACKET_HEADER_SIZE);
    const numLaps = buffer.readUInt8(PACKET_HEADER_SIZE + 1);
    const numTyreStints = buffer.readUInt8(PACKET_HEADER_SIZE + 2);
    const bestLapTimeLapNum = buffer.readUInt8(PACKET_HEADER_SIZE + 3);
    const bestSector1LapNum = buffer.readUInt8(PACKET_HEADER_SIZE + 4);
    const bestSector2LapNum = buffer.readUInt8(PACKET_HEADER_SIZE + 5);
    const bestSector3LapNum = buffer.readUInt8(PACKET_HEADER_SIZE + 6);

    const lapHistoryData: LapHistoryData[] = [];
    const lapStride = 14; // F1 25 Stride (4 + 2+1 + 2+1 + 2+1 + 1)
    for (let i = 0; i < 100; i++) {
        const offset = PACKET_HEADER_SIZE + 7 + (i * lapStride);
        if (offset + lapStride > buffer.length) break;
        
        lapHistoryData.push({
            lapTimeInMS: buffer.readUInt32LE(offset),
            sector1TimeInMS: buffer.readUInt16LE(offset + 4),
            sector1TimeMinutes: buffer.readUInt8(offset + 6),
            sector2TimeInMS: buffer.readUInt16LE(offset + 7),
            sector2TimeMinutes: buffer.readUInt8(offset + 9),
            sector3TimeInMS: buffer.readUInt16LE(offset + 10),
            sector3TimeMinutes: buffer.readUInt8(offset + 12),
            lapValidBitFlags: buffer.readUInt8(offset + 13),
        });
    }

    const tyreStintHistoryData: TyreStintHistoryData[] = [];
    const stintStride = 3;
    const stintsOffset = PACKET_HEADER_SIZE + 7 + (100 * lapStride);
    for (let i = 0; i < 8; i++) {
        const offset = stintsOffset + (i * stintStride);
        if (offset + stintStride > buffer.length) break;

        tyreStintHistoryData.push({
            endLap: buffer.readUInt8(offset),
            tyreActualCompound: buffer.readUInt8(offset + 1),
            tyreVisualCompound: buffer.readUInt8(offset + 2),
        });
    }

    return {
        carIdx,
        numLaps,
        numTyreStints,
        bestLapTimeLapNum,
        bestSector1LapNum,
        bestSector2LapNum,
        bestSector3LapNum,
        lapHistoryData,
        tyreStintHistoryData,
    };
}
