import { PacketHeader } from './header';

export interface FinalClassificationData {
    position: number;
    numLaps: number;
    gridPosition: number;
    points: number;
    numPitStops: number;
    resultStatus: number;
    bestLapTimeInMS: number;
    totalRaceTime: number;
    penaltiesTime: number;
    numWarnings: number;
    numTyreStints: number;
    tyreStintsActual: number[];
    tyreStintsVisual: number[];
    tyreStintsEndLaps: number[];
}

export interface PacketFinalClassificationData {
    header: PacketHeader;
    numCars: number;
    classificationData: FinalClassificationData[];
}

export function parseFinalClassificationData(buffer: Buffer, header: PacketHeader): PacketFinalClassificationData {
    let offset = 29; // Header size
    const numCars = buffer.readUInt8(offset++);
    
    const classificationData: FinalClassificationData[] = [];
    for (let i = 0; i < 22; i++) {
        const position = buffer.readUInt8(offset++);
        const numLaps = buffer.readUInt8(offset++);
        const gridPosition = buffer.readUInt8(offset++);
        const points = buffer.readUInt8(offset++);
        const numPitStops = buffer.readUInt8(offset++);
        const resultStatus = buffer.readUInt8(offset++);
        const bestLapTimeInMS = buffer.readUInt32LE(offset); offset += 4;
        const totalRaceTime = buffer.readDoubleLE(offset); offset += 8;
        const penaltiesTime = buffer.readUInt8(offset++);
        const numWarnings = buffer.readUInt8(offset++);
        const numTyreStints = buffer.readUInt8(offset++);

        const tyreStintsActual: number[] = [];
        for (let j = 0; j < 8; j++) tyreStintsActual.push(buffer.readUInt8(offset++));
        const tyreStintsVisual: number[] = [];
        for (let j = 0; j < 8; j++) tyreStintsVisual.push(buffer.readUInt8(offset++));
        const tyreStintsEndLaps: number[] = [];
        for (let j = 0; j < 8; j++) tyreStintsEndLaps.push(buffer.readUInt8(offset++));

        classificationData.push({
            position, numLaps, gridPosition, points, numPitStops, resultStatus,
            bestLapTimeInMS, totalRaceTime, penaltiesTime, numWarnings, numTyreStints,
            tyreStintsActual, tyreStintsVisual, tyreStintsEndLaps
        });
    }

    return { header, numCars, classificationData };
}
