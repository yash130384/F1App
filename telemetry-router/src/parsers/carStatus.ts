import { PACKET_HEADER_SIZE } from './header';

export interface CarStatusData {
    tractionControl: number;
    antiLockBrakes: number;
    fuelMix: number;
    frontBrakeBias: number;
    pitLimiterStatus: number;
    fuelInTank: number;
    fuelCapacity: number;
    fuelRemainingLaps: number;
    maxRPM: number;
    idleRPM: number;
    maxGears: number;
    drsAllowed: number;
    drsActivationDistance: number;
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    vehicleFiaFlags: number;
    enginePowerICE: number;
    enginePowerMGUK: number;
    ersStoreEnergy: number;
    ersDeployMode: number;
    ersHarvestedThisLapMGUK: number;
    ersHarvestedThisLapMGUH: number;
    ersDeployedThisLap: number;
    networkPaused: number;
}

export function parseCarStatus(buffer: Buffer): CarStatusData[] {
    const carStatusData: CarStatusData[] = [];
    const stride = 55; // F1 25 Stride

    for (let i = 0; i < 22; i++) {
        const offset = PACKET_HEADER_SIZE + (i * stride);
        if (offset + stride > buffer.length) break;

        carStatusData.push({
            tractionControl: buffer.readUInt8(offset),
            antiLockBrakes: buffer.readUInt8(offset + 1),
            fuelMix: buffer.readUInt8(offset + 2),
            frontBrakeBias: buffer.readUInt8(offset + 3),
            pitLimiterStatus: buffer.readUInt8(offset + 4),
            fuelInTank: buffer.readFloatLE(offset + 5),
            fuelCapacity: buffer.readFloatLE(offset + 9),
            fuelRemainingLaps: buffer.readFloatLE(offset + 13),
            maxRPM: buffer.readUInt16LE(offset + 17),
            idleRPM: buffer.readUInt16LE(offset + 19),
            maxGears: buffer.readUInt8(offset + 21),
            drsAllowed: buffer.readUInt8(offset + 22),
            drsActivationDistance: buffer.readUInt16LE(offset + 23),
            actualTyreCompound: buffer.readUInt8(offset + 25),
            visualTyreCompound: buffer.readUInt8(offset + 26),
            tyresAgeLaps: buffer.readUInt8(offset + 27),
            vehicleFiaFlags: buffer.readInt8(offset + 28),
            enginePowerICE: buffer.readFloatLE(offset + 29),
            enginePowerMGUK: buffer.readFloatLE(offset + 33),
            ersStoreEnergy: buffer.readFloatLE(offset + 37),
            ersDeployMode: buffer.readUInt8(offset + 41),
            ersHarvestedThisLapMGUK: buffer.readFloatLE(offset + 42),
            ersHarvestedThisLapMGUH: buffer.readFloatLE(offset + 46),
            ersDeployedThisLap: buffer.readFloatLE(offset + 50),
            networkPaused: buffer.readUInt8(offset + 54),
        });
    }

    return carStatusData;
}
