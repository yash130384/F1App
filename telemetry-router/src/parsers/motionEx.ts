import { PACKET_HEADER_SIZE } from './header';

export interface MotionExData {
    suspensionPosition: number[];
    suspensionVelocity: number[];
    suspensionAcceleration: number[];
    wheelSpeed: number[];
    wheelSlipRatio: number[];
    wheelSlipAngle: number[];
    wheelLatForce: number[];
    wheelLongForce: number[];
    heightOfCOGAboveGround: number;
    localVelocityX: number;
    localVelocityY: number;
    localVelocityZ: number;
    angularVelocityX: number;
    angularVelocityY: number;
    angularVelocityZ: number;
    angularAccelerationX: number;
    angularAccelerationY: number;
    angularAccelerationZ: number;
    frontAeroHeight: number;
    rearAeroHeight: number;
}

export function parseMotionEx(buffer: Buffer): MotionExData {
    let offset = PACKET_HEADER_SIZE;

    const readFloatArray = (len: number) => {
        const arr = [];
        for (let i = 0; i < len; i++) {
            if (offset + 4 <= buffer.length) {
                arr.push(buffer.readFloatLE(offset));
                offset += 4;
            }
        }
        return arr;
    };

    return {
        suspensionPosition: readFloatArray(4),
        suspensionVelocity: readFloatArray(4),
        suspensionAcceleration: readFloatArray(4),
        wheelSpeed: readFloatArray(4),
        wheelSlipRatio: readFloatArray(4),
        wheelSlipAngle: readFloatArray(4),
        wheelLatForce: readFloatArray(4),
        wheelLongForce: readFloatArray(4),
        heightOfCOGAboveGround: buffer.readFloatLE(offset),
        localVelocityX: buffer.readFloatLE(offset + 4),
        localVelocityY: buffer.readFloatLE(offset + 8),
        localVelocityZ: buffer.readFloatLE(offset + 12),
        angularVelocityX: buffer.readFloatLE(offset + 16),
        angularVelocityY: buffer.readFloatLE(offset + 20),
        angularVelocityZ: buffer.readFloatLE(offset + 24),
        angularAccelerationX: buffer.readFloatLE(offset + 28),
        angularAccelerationY: buffer.readFloatLE(offset + 32),
        angularAccelerationZ: buffer.readFloatLE(offset + 36),
        frontAeroHeight: buffer.readFloatLE(offset + 40),
        rearAeroHeight: buffer.readFloatLE(offset + 44),
    };
}
