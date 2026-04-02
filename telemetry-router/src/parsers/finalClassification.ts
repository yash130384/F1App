import { PACKET_HEADER_SIZE } from './header';

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
    numPenalties: number;
    numTyreStints: number;
    tyreStintsActual: number[];
    tyreStintsVisual: number[];
    tyreStintsEndLaps: number[];
}

export interface PacketFinalClassificationData {
    numCars: number;
    classificationData: FinalClassificationData[];
}

export function parseFinalClassification(buffer: Buffer): PacketFinalClassificationData {
    let offset = PACKET_HEADER_SIZE;
    const numCars = buffer.readUInt8(offset);
    offset += 1;

    const classificationData: FinalClassificationData[] = [];
    const stride = 45; // F1 25 Stride

    for (let i = 0; i < 22; i++) {
        const base = offset + (i * stride);
        if (base + stride > buffer.length) break;

        classificationData.push({
            position: buffer.readUInt8(base),
            numLaps: buffer.readUInt8(base + 1),
            gridPosition: buffer.readUInt8(base + 2),
            points: buffer.readUInt8(base + 3),
            numPitStops: buffer.readUInt8(base + 4),
            resultStatus: buffer.readUInt8(base + 5),
            bestLapTimeInMS: buffer.readUInt32LE(base + 6),
            totalRaceTime: buffer.readDoubleLE(base + 10),
            penaltiesTime: buffer.readUInt8(base + 18),
            numPenalties: buffer.readUInt8(base + 19),
            numTyreStints: buffer.readUInt8(base + 20),
            tyreStintsActual: Array.from(buffer.subarray(base + 21, base + 29)),
            tyreStintsVisual: Array.from(buffer.subarray(base + 29, base + 37)),
            tyreStintsEndLaps: Array.from(buffer.subarray(base + 37, base + 45)),
        });
    }

    return {
        numCars,
        classificationData,
    };
}
