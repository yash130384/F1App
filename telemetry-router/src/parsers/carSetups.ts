export interface CarSetupData {
    frontWing: number;
    rearWing: number;
    onThrottle: number;
    offThrottle: number;
    frontCamber: number;
    rearCamber: number;
    frontToe: number;
    rearToe: number;
    frontSuspension: number;
    rearSuspension: number;
    frontAntiRollBar: number;
    rearAntiRollBar: number;
    frontSuspensionHeight: number;
    rearSuspensionHeight: number;
    brakePressure: number;
    brakeBias: number;
    engineBraking: number;
    rearLeftTyrePressure: number;
    rearRightTyrePressure: number;
    frontLeftTyrePressure: number;
    frontRightTyrePressure: number;
    ballast: number;
    fuelLoad: number;
}

const CAR_SETUP_SIZE = 50;

export function parseCarSetups(buffer: Buffer): CarSetupData[] {
    const setups: CarSetupData[] = [];

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * CAR_SETUP_SIZE);
        if (offset + CAR_SETUP_SIZE > buffer.length) break;

        setups.push({
            frontWing: buffer.readUInt8(offset + 0),
            rearWing: buffer.readUInt8(offset + 1),
            onThrottle: buffer.readUInt8(offset + 2),
            offThrottle: buffer.readUInt8(offset + 3),
            frontCamber: buffer.readFloatLE(offset + 4),
            rearCamber: buffer.readFloatLE(offset + 8),
            frontToe: buffer.readFloatLE(offset + 12),
            rearToe: buffer.readFloatLE(offset + 16),
            frontSuspension: buffer.readUInt8(offset + 20),
            rearSuspension: buffer.readUInt8(offset + 21),
            frontAntiRollBar: buffer.readUInt8(offset + 22),
            rearAntiRollBar: buffer.readUInt8(offset + 23),
            frontSuspensionHeight: buffer.readUInt8(offset + 24),
            rearSuspensionHeight: buffer.readUInt8(offset + 25),
            brakePressure: buffer.readUInt8(offset + 26),
            brakeBias: buffer.readUInt8(offset + 27),
            engineBraking: buffer.readUInt8(offset + 28),
            rearLeftTyrePressure: buffer.readFloatLE(offset + 29),
            rearRightTyrePressure: buffer.readFloatLE(offset + 33),
            frontLeftTyrePressure: buffer.readFloatLE(offset + 37),
            frontRightTyrePressure: buffer.readFloatLE(offset + 41),
            ballast: buffer.readUInt8(offset + 45),
            fuelLoad: buffer.readFloatLE(offset + 46),
        });
    }

    return setups;
}
