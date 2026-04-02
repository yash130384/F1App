import { PACKET_HEADER_SIZE } from './header';

export interface CarDamageData {
    tyresWear: number[];
    tyresDamage: number[];
    brakesDamage: number[];
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    floorDamage: number;
    diffuserDamage: number;
    sidepodDamage: number;
    drsFault: number;
    ersFault: number;
    gearBoxDamage: number;
    engineDamage: number;
    engineMGUHDamage: number;
    engineESTDamage: number;
    engineCEDamage: number;
    engineICEDamage: number;
    engineMGUKDamage: number;
    engineTCDamage: number;
    engineFuelPressureFault: number;
}

export function parseCarDamage(buffer: Buffer): CarDamageData[] {
    const carDamageData: CarDamageData[] = [];
    const stride = 42; // F1 25 Stride

    for (let i = 0; i < 22; i++) {
        const offset = PACKET_HEADER_SIZE + (i * stride);
        if (offset + stride > buffer.length) break;

        carDamageData.push({
            tyresWear: [
                buffer.readFloatLE(offset),
                buffer.readFloatLE(offset + 4),
                buffer.readFloatLE(offset + 8),
                buffer.readFloatLE(offset + 12),
            ],
            tyresDamage: [
                buffer.readUInt8(offset + 16),
                buffer.readUInt8(offset + 17),
                buffer.readUInt8(offset + 18),
                buffer.readUInt8(offset + 19),
            ],
            brakesDamage: [
                buffer.readUInt8(offset + 20),
                buffer.readUInt8(offset + 21),
                buffer.readUInt8(offset + 22),
                buffer.readUInt8(offset + 23),
            ],
            frontLeftWingDamage: buffer.readUInt8(offset + 24),
            frontRightWingDamage: buffer.readUInt8(offset + 25),
            rearWingDamage: buffer.readUInt8(offset + 26),
            floorDamage: buffer.readUInt8(offset + 27),
            diffuserDamage: buffer.readUInt8(offset + 28),
            sidepodDamage: buffer.readUInt8(offset + 29),
            drsFault: buffer.readUInt8(offset + 30),
            ersFault: buffer.readUInt8(offset + 31),
            gearBoxDamage: buffer.readUInt8(offset + 32),
            engineDamage: buffer.readUInt8(offset + 33),
            engineMGUHDamage: buffer.readUInt8(offset + 34),
            engineESTDamage: buffer.readUInt8(offset + 35),
            engineCEDamage: buffer.readUInt8(offset + 36),
            engineICEDamage: buffer.readUInt8(offset + 37),
            engineMGUKDamage: buffer.readUInt8(offset + 38),
            engineTCDamage: buffer.readUInt8(offset + 39),
            engineFuelPressureFault: buffer.readUInt8(offset + 40),
        });
    }

    return carDamageData;
}
