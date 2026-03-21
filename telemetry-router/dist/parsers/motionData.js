"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMotionData = parseMotionData;
// PacketMotionData: Header (29 bytes) + 22 * CarMotionData
// CarMotionData per car layout (F1 25):
//   worldPositionX:       float  (offset 0)
//   worldPositionY:       float  (offset 4)
//   worldPositionZ:       float  (offset 8)
//   worldVelocityX:       float  (offset 12)
//   worldVelocityY:       float  (offset 16)
//   worldVelocityZ:       float  (offset 20)
//   worldForwardDirX:     int16  (offset 24)
//   worldForwardDirY:     int16  (offset 26)
//   worldForwardDirZ:     int16  (offset 28)
//   worldRightDirX:       int16  (offset 30)
//   worldRightDirY:       int16  (offset 32)
//   worldRightDirZ:       int16  (offset 34)
//   gForceLateral:        float  (offset 36)
//   gForceLongitudinal:   float  (offset 40)
//   gForceVertical:       float  (offset 44)
//   yaw:                  float  (offset 48)
//   pitch:                float  (offset 52)
//   roll:                 float  (offset 56)
// Total per car: 60 bytes
const CAR_MOTION_SIZE = 60;
function parseMotionData(buffer) {
    const motions = [];
    for (let i = 0; i < 22; i++) {
        const base = 29 + i * CAR_MOTION_SIZE;
        if (base + CAR_MOTION_SIZE > buffer.length)
            break;
        motions.push({
            worldPositionX: buffer.readFloatLE(base + 0),
            worldPositionY: buffer.readFloatLE(base + 4),
            worldPositionZ: buffer.readFloatLE(base + 8),
            gForceLateral: buffer.readFloatLE(base + 36),
            gForceLongitudinal: buffer.readFloatLE(base + 40),
            gForceVertical: buffer.readFloatLE(base + 44),
        });
    }
    return motions;
}
