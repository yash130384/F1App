"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFinalClassificationData = parseFinalClassificationData;
function parseFinalClassificationData(buffer, header) {
    let offset = 29; // Header size
    const numCars = buffer.readUInt8(offset++);
    const classificationData = [];
    // Always 22 cars in the array regardless of active cars
    for (let i = 0; i < 22; i++) {
        const position = buffer.readUInt8(offset++);
        const numLaps = buffer.readUInt8(offset++);
        const gridPosition = buffer.readUInt8(offset++);
        const points = buffer.readUInt8(offset++);
        const numPitStops = buffer.readUInt8(offset++);
        const resultStatus = buffer.readUInt8(offset++);
        const resultReason = buffer.readUInt8(offset++); // F1 25
        const bestLapTimeInMS = buffer.readUInt32LE(offset);
        offset += 4;
        const totalRaceTime = buffer.readDoubleLE(offset);
        offset += 8;
        const penaltiesTime = buffer.readUInt8(offset++);
        const numPenalties = buffer.readUInt8(offset++); // F1 25 (was numWarnings in older versions)
        const numTyreStints = buffer.readUInt8(offset++);
        const tyreStintsActual = [];
        for (let j = 0; j < 8; j++)
            tyreStintsActual.push(buffer.readUInt8(offset++));
        const tyreStintsVisual = [];
        for (let j = 0; j < 8; j++)
            tyreStintsVisual.push(buffer.readUInt8(offset++));
        const tyreStintsEndLaps = [];
        for (let j = 0; j < 8; j++)
            tyreStintsEndLaps.push(buffer.readUInt8(offset++));
        classificationData.push({
            position, numLaps, gridPosition, points, numPitStops, resultStatus,
            resultReason, bestLapTimeInMS, totalRaceTime, penaltiesTime, numPenalties,
            numTyreStints, tyreStintsActual, tyreStintsVisual, tyreStintsEndLaps
        });
    }
    return { header, numCars, classificationData };
}
