import { PacketHeader } from './header';

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
    frontWheelsAngle: number;
    wheelVertForce: number[];
    frontAeroHeight: number;
    rearAeroHeight: number;
    frontRollAngle: number;
    rearRollAngle: number;
    chassisYaw: number;
    chassisPitch: number;
    wheelCamber: number[];
    wheelCamberGain: number[];
}

export function parseMotionExData(buffer: Buffer): MotionExData {
    let offset = 29; // Header

    const suspensionPosition = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const suspensionVelocity = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const suspensionAcceleration = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelSpeed = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelSlipRatio = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelSlipAngle = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelLatForce = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelLongForce = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const heightOfCOGAboveGround = buffer.readFloatLE(offset); offset += 4;
    const localVelocityX = buffer.readFloatLE(offset); offset += 4;
    const localVelocityY = buffer.readFloatLE(offset); offset += 4;
    const localVelocityZ = buffer.readFloatLE(offset); offset += 4;
    const angularVelocityX = buffer.readFloatLE(offset); offset += 4;
    const angularVelocityY = buffer.readFloatLE(offset); offset += 4;
    const angularVelocityZ = buffer.readFloatLE(offset); offset += 4;
    const angularAccelerationX = buffer.readFloatLE(offset); offset += 4;
    const angularAccelerationY = buffer.readFloatLE(offset); offset += 4;
    const angularAccelerationZ = buffer.readFloatLE(offset); offset += 4;
    const frontWheelsAngle = buffer.readFloatLE(offset); offset += 4;

    const wheelVertForce = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const frontAeroHeight = buffer.readFloatLE(offset); offset += 4;
    const rearAeroHeight = buffer.readFloatLE(offset); offset += 4;
    const frontRollAngle = buffer.readFloatLE(offset); offset += 4;
    const rearRollAngle = buffer.readFloatLE(offset); offset += 4;
    const chassisYaw = buffer.readFloatLE(offset); offset += 4;
    const chassisPitch = buffer.readFloatLE(offset); offset += 4;

    const wheelCamber = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    const wheelCamberGain = [
        buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8), buffer.readFloatLE(offset + 12)
    ]; offset += 16;

    return {
        suspensionPosition, suspensionVelocity, suspensionAcceleration,
        wheelSpeed, wheelSlipRatio, wheelSlipAngle, wheelLatForce, wheelLongForce,
        heightOfCOGAboveGround, localVelocityX, localVelocityY, localVelocityZ,
        angularVelocityX, angularVelocityY, angularVelocityZ,
        angularAccelerationX, angularAccelerationY, angularAccelerationZ,
        frontWheelsAngle, wheelVertForce, frontAeroHeight, rearAeroHeight,
        frontRollAngle, rearRollAngle, chassisYaw, chassisPitch,
        wheelCamber, wheelCamberGain
    };
}
