"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSessionHistoryData = parseSessionHistoryData;
function parseSessionHistoryData(buffer, header) {
    let offset = 29; // Header size
    const carIdx = buffer.readUInt8(offset++);
    const numLaps = buffer.readUInt8(offset++);
    const numTyreStints = buffer.readUInt8(offset++);
    const bestLapTimeLapNum = buffer.readUInt8(offset++);
    const bestSector1LapNum = buffer.readUInt8(offset++);
    const bestSector2LapNum = buffer.readUInt8(offset++);
    const bestSector3LapNum = buffer.readUInt8(offset++);
    const lapHistoryData = [];
    for (let i = 0; i < 100; i++) {
        const lapTimeInMS = buffer.readUInt32LE(offset);
        offset += 4;
        const sector1TimeInMS = buffer.readUInt16LE(offset);
        offset += 2;
        const sector1TimeMinutes = buffer.readUInt8(offset++);
        const sector2TimeInMS = buffer.readUInt16LE(offset);
        offset += 2;
        const sector2TimeMinutes = buffer.readUInt8(offset++);
        const sector3TimeInMS = buffer.readUInt16LE(offset);
        offset += 2;
        const sector3TimeMinutes = buffer.readUInt8(offset++);
        const lapValidFlags = buffer.readUInt8(offset++);
        lapHistoryData.push({
            lapTimeInMS, sector1TimeInMS, sector1TimeMinutes,
            sector2TimeInMS, sector2TimeMinutes, sector3TimeInMS,
            sector3TimeMinutes, lapValidFlags
        });
    }
    const tyreStintHistoryData = [];
    for (let i = 0; i < 8; i++) {
        const endLap = buffer.readUInt8(offset++);
        const tyreActualCompound = buffer.readUInt8(offset++);
        const tyreVisualCompound = buffer.readUInt8(offset++);
        tyreStintHistoryData.push({ endLap, tyreActualCompound, tyreVisualCompound });
    }
    return {
        header, carIdx, numLaps, numTyreStints, bestLapTimeLapNum,
        bestSector1LapNum, bestSector2LapNum, bestSector3LapNum,
        lapHistoryData, tyreStintHistoryData
    };
}
