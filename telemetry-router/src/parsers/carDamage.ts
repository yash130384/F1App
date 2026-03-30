export interface CarDamageData {
    tyresWear: number[];         // [RL, RR, FL, FR] percentage (float)
    tyresDamage: number[];       // [RL, RR, FL, FR] percentage (uint8)
    brakesDamage: number[];      // [RL, RR, FL, FR] percentage (uint8)
    tyreBlisters: number[];      // [RL, RR, FL, FR] – NEU in F1 25 (uint8)
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    floorDamage: number;
    diffuserDamage: number;
    sidepodDamage: number;
    drsFault: number;            // 0 = OK, 1 = fault
    ersFault: number;            // 0 = OK, 1 = fault
    gearBoxDamage: number;
    engineDamage: number;
    engineBlown: number;         // 0 = OK, 1 = fault
    engineSeized: number;        // 0 = OK, 1 = fault
}

// PacketCarDamageData: Header (29 bytes) + 22 * CarDamageData
// CarDamageData layout (per car):
//  tyresWear[4]:           4 * float = 16 bytes  (offset 0)
//  tyresDamage[4]:         4 * uint8 = 4 bytes   (offset 16)
//  brakesDamage[4]:        4 * uint8 = 4 bytes   (offset 20)
//  tyreBlisters[4]:        4 * uint8 = 4 bytes   (offset 24)  ← NEU F1 25
//  frontLeftWingDamage:    uint8                 (offset 28)
//  frontRightWingDamage:   uint8                 (offset 29)
//  rearWingDamage:         uint8                 (offset 30)
//  floorDamage:            uint8                 (offset 31)
//  diffuserDamage:         uint8                 (offset 32)
//  sidepodDamage:          uint8                 (offset 33)
//  drsFault:               uint8                 (offset 34)
//  ersFault:               uint8                 (offset 35)
//  gearBoxDamage:          uint8                 (offset 36)
//  engineDamage:           uint8                 (offset 37)
//  engineMGUHWear:         uint8                 (offset 38)
//  engineESWear:           uint8                 (offset 39)
//  engineCEWear:           uint8                 (offset 40)
//  engineICEWear:          uint8                 (offset 41)
//  engineMGUKWear:         uint8                 (offset 42)
//  engineTCWear:           uint8                 (offset 43)
//  engineBlown:            uint8                 (offset 44)
//  engineSeized:           uint8                 (offset 45)
// Total per car: 46 bytes
const CAR_DAMAGE_SIZE = 46;

export function parseCarDamage(buffer: Buffer): CarDamageData[] {
    const damages: CarDamageData[] = [];

    for (let i = 0; i < 22; i++) {
        const base = 29 + i * CAR_DAMAGE_SIZE;

        const tyresWear = [
            buffer.readFloatLE(base + 0),
            buffer.readFloatLE(base + 4),
            buffer.readFloatLE(base + 8),
            buffer.readFloatLE(base + 12),
        ];

        const tyresDamage = [
            buffer.readUInt8(base + 16),
            buffer.readUInt8(base + 17),
            buffer.readUInt8(base + 18),
            buffer.readUInt8(base + 19),
        ];

        const brakesDamage = [
            buffer.readUInt8(base + 20),
            buffer.readUInt8(base + 21),
            buffer.readUInt8(base + 22),
            buffer.readUInt8(base + 23),
        ];

        const tyreBlisters = [
            buffer.readUInt8(base + 24),
            buffer.readUInt8(base + 25),
            buffer.readUInt8(base + 26),
            buffer.readUInt8(base + 27),
        ];

        damages.push({
            tyresWear,
            tyresDamage,
            brakesDamage,
            tyreBlisters,
            frontLeftWingDamage: buffer.readUInt8(base + 28),
            frontRightWingDamage: buffer.readUInt8(base + 29),
            rearWingDamage: buffer.readUInt8(base + 30),
            floorDamage: buffer.readUInt8(base + 31),
            diffuserDamage: buffer.readUInt8(base + 32),
            sidepodDamage: buffer.readUInt8(base + 33),
            drsFault: buffer.readUInt8(base + 34),
            ersFault: buffer.readUInt8(base + 35),
            gearBoxDamage: buffer.readUInt8(base + 36),
            engineDamage: buffer.readUInt8(base + 37),
            engineBlown: buffer.readUInt8(base + 44),
            engineSeized: buffer.readUInt8(base + 45),
        });
    }

    return damages;
}
