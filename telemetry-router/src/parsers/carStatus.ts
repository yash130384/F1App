export interface CarStatusData {
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    vehicleFIAFlags: number;
    // ERS
    ersDeployMode: number;       // 0=None, 1=Medium, 2=Hotlap, 3=Overtake
    ersStoreEnergy: number;      // ERS Energie im Speicher (Joule)
    ersDeployedThisLap: number;  // ERS verbraucht diese Runde (Joule)
    ersHarvestedThisLapMGUK: number;
    ersHarvestedThisLapMGUH: number;
    // Kraftstoff
    fuelMix: number;             // 0=Lean, 1=Standard, 2=Rich, 3=Max
    fuelRemainingLaps: number;   // Verbleibende Runden auf aktuellem Mix
    fuelInTank: number;          // Aktueller Kraftstofftank (kg)
    fuelCapacity: number;        // Maximale Tankkapazität (kg)
    // Engine & Gear
    enginePowerICE: number;
    enginePowerMGUK: number;
    maxRPM: number;
    idleRPM: number;
    maxGears: number;
    // DRS
    drsAllowed: number;
    drsActivationDistance: number;
}

// PacketCarStatusData: Header (29 bytes) + 22 * CarStatusData
// CarStatusData layout (F1 25, 55 bytes per car):
//   tractionControl:      uint8   (offset 0)
//   antiLockBrakes:       uint8   (offset 1)
//   fuelMix:              uint8   (offset 2)
//   frontBrakeBias:       uint8   (offset 3)
//   pitLimiterStatus:     uint8   (offset 4)
//   fuelInTank:           float   (offset 5)
//   fuelCapacity:         float   (offset 9)
//   fuelRemainingLaps:    float   (offset 13)
//   maxRPM:               uint16  (offset 17)
//   idleRPM:              uint16  (offset 19)
//   maxGears:             uint8   (offset 21)
//   drsAllowed:           uint8   (offset 22)
//   drsActivationDistance: uint16 (offset 23)
//   actualTyreCompound:   uint8   (offset 25)
//   visualTyreCompound:   uint8   (offset 26)
//   tyresAgeLaps:         uint8   (offset 27)
//   vehicleFIAFlags:      int8    (offset 28)
//   enginePowerICE:       float   (offset 29)
//   enginePowerMGUK:      float   (offset 33)
//   ersStoreEnergy:       float   (offset 37)
//   ersDeployMode:        uint8   (offset 41)
//   ersHarvestedThisLapMGUK: float (offset 42)
//   ersHarvestedThisLapMGUH: float (offset 46)
//   ersDeployedThisLap:   float   (offset 50)
//   networkPaused:        uint8   (offset 54)
// Total per car: 55 bytes
const CAR_STATUS_SIZE = 55;

export function parseCarStatus(buffer: Buffer): CarStatusData[] {
    const statuses: CarStatusData[] = [];

    for (let i = 0; i < 22; i++) {
        const offset = 29 + (i * CAR_STATUS_SIZE);
        if (offset + CAR_STATUS_SIZE > buffer.length) break;

        statuses.push({
            fuelMix: buffer.readUInt8(offset + 2),
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
            vehicleFIAFlags: buffer.readInt8(offset + 28),
            enginePowerICE: buffer.readFloatLE(offset + 29),
            enginePowerMGUK: buffer.readFloatLE(offset + 33),
            ersStoreEnergy: buffer.readFloatLE(offset + 37),
            ersDeployMode: buffer.readUInt8(offset + 41),
            ersHarvestedThisLapMGUK: buffer.readFloatLE(offset + 42),
            ersHarvestedThisLapMGUH: buffer.readFloatLE(offset + 46),
            ersDeployedThisLap: buffer.readFloatLE(offset + 50),
        });
    }

    return statuses;
}
