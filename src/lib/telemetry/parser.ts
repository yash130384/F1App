import { 
  PacketId, 
  PacketHeader, 
  CarMotionData, 
  PacketMotionData,
  ParticipantData,
  PacketParticipantsData,
  CarTelemetryData,
  PacketCarTelemetryData,
  CarStatusData,
  PacketCarStatusData,
  CarDamageData,
  PacketCarDamageData,
  LapData,
  PacketLapData,
  TyreSetData,
  PacketTyreSetsData,
  FinalClassificationData,
  PacketFinalClassificationData,
  LobbyInfoData,
  PacketLobbyInfoData,
  TimeTrialDataSet,
  PacketTimeTrialData
} from './types';

export class TelemetryParser {
  private view: DataView;
  private offset: number;

  constructor(buffer: ArrayBuffer, fileOffset: number = 6) {
    this.view = new DataView(buffer);
    this.offset = fileOffset;
  }

  private readHeader(offset: number): PacketHeader {
    return {
      m_packetFormat: this.view.getUint16(offset, true),
      m_gameYear: this.view.getUint8(offset + 2),
      m_gameMajorVersion: this.view.getUint8(offset + 3),
      m_gameMinorVersion: this.view.getUint8(offset + 4),
      m_packetVersion: this.view.getUint8(offset + 5),
      m_packetId: this.view.getUint8(offset + 6),
      m_sessionUID: Number(this.view.getBigUint64(offset + 7, true)),
      m_sessionTime: this.view.getFloat32(offset + 15, true),
      m_frameIdentifier: this.view.getUint32(offset + 19, true),
      m_overallFrameIdentifier: this.view.getUint32(offset + 23, true),
      m_playerCarIndex: this.view.getUint8(offset + 27),
      m_secondaryPlayerCarIndex: this.view.getUint8(offset + 28),
    };
  }

  private readCarMotionData(offset: number): CarMotionData {
    return {
      m_worldPositionX: this.view.getFloat32(offset, true),
      m_worldPositionY: this.view.getFloat32(offset + 4, true),
      m_worldPositionZ: this.view.getFloat32(offset + 8, true),
      m_worldVelocityX: this.view.getFloat32(offset + 12, true),
      m_worldVelocityY: this.view.getFloat32(offset + 16, true),
      m_worldVelocityZ: this.view.getFloat32(offset + 20, true),
      m_worldForwardDirX: this.view.getInt16(offset + 24, true),
      m_worldForwardDirY: this.view.getInt16(offset + 26, true),
      m_worldForwardDirZ: this.view.getInt16(offset + 28, true),
      m_worldRightDirX: this.view.getInt16(offset + 30, true),
      m_worldRightDirY: this.view.getInt16(offset + 32, true),
      m_worldRightDirZ: this.view.getInt16(offset + 34, true),
      m_gForceLateral: this.view.getFloat32(offset + 36, true),
      m_gForceLongitudinal: this.view.getFloat32(offset + 40, true),
      m_gForceVertical: this.view.getFloat32(offset + 44, true),
      m_yaw: this.view.getFloat32(offset + 48, true),
      m_pitch: this.view.getFloat32(offset + 52, true),
      m_roll: this.view.getFloat32(offset + 56, true),
    };
  }

  private readParticipantData(offset: number): ParticipantData {
    const nameBytes = new Uint8Array(this.view.buffer, this.view.byteOffset + offset + 18, 32);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    return {
      m_aiControlled: this.view.getUint8(offset),
      m_driverId: this.view.getUint8(offset + 1),
      m_networkId: this.view.getUint16(offset + 2, true),
      m_teamId: this.view.getUint8(offset + 4),
      m_myTeam: this.view.getUint8(offset + 5),
      m_raceNumber: this.view.getUint8(offset + 6),
      m_nationality: this.view.getUint8(offset + 7),
      m_name: name,
      m_yourTelemetry: this.view.getUint8(offset + 8),
      m_showOnlineNames: this.view.getUint8(offset + 9),
      m_techLevel: this.view.getUint16(offset + 10, true),
      m_platform: this.view.getUint8(offset + 12),
      m_numColours: this.view.getUint8(offset + 13),
      m_liveryColours: Array.from({ length: 4 }, (_, i) => ({
        red: this.view.getUint8(offset + 14 + i * 3),
        green: this.view.getUint8(offset + 15 + i * 3),
        blue: this.view.getUint8(offset + 16 + i * 3),
      })),
    };
  }

  private readCarTelemetryData(offset: number): CarTelemetryData {
    return {
      m_speed: this.view.getUint16(offset, true),
      m_throttle: this.view.getFloat32(offset + 2, true),
      m_steer: this.view.getFloat32(offset + 6, true),
      m_brake: this.view.getFloat32(offset + 10, true),
      m_clutch: this.view.getUint8(offset + 14),
      m_gear: this.view.getInt8(offset + 15),
      m_engineRPM: this.view.getUint16(offset + 16, true),
      m_drs: this.view.getUint8(offset + 18),
      m_revLightsPercent: this.view.getUint8(offset + 19),
      m_revLightsBitValue: this.view.getUint16(offset + 20, true),
      m_brakesTemperature: [
        this.view.getUint16(offset + 22, true),
        this.view.getUint16(offset + 24, true),
        this.view.getUint16(offset + 26, true),
        this.view.getUint16(offset + 28, true),
      ],
      m_tyresSurfaceTemperature: [
        this.view.getUint8(offset + 30),
        this.view.getUint8(offset + 31),
        this.view.getUint8(offset + 32),
        this.view.getUint8(offset + 33),
      ],
      m_tyresInnerTemperature: [
        this.view.getUint8(offset + 34),
        this.view.getUint8(offset + 35),
        this.view.getUint8(offset + 36),
        this.view.getUint8(offset + 37),
      ],
      m_engineTemperature: this.view.getUint16(offset + 38, true),
      m_tyresPressure: [
        this.view.getFloat32(offset + 40, true),
        this.view.getFloat32(offset + 44, true),
        this.view.getFloat32(offset + 48, true),
        this.view.getFloat32(offset + 52, true),
      ],
      m_surfaceType: [
        this.view.getUint8(offset + 56),
        this.view.getUint8(offset + 57),
        this.view.getUint8(offset + 58),
        this.view.getUint8(offset + 59),
      ],
    };
  }

  public parseAll(): any[] {
    const packets: any[] = [];
    let currentPos = this.offset;

    while (currentPos + 51 < this.view.byteLength) {
      if (this.view.getUint16(currentPos, true) !== 2025) {
        currentPos++;
        continue;
      }

      const header = this.readHeader(currentPos);
      const packetId = header.m_packetId;
      let packetSize = 0;
      let data: any = { header };

      try {
        switch (packetId) {
          case PacketId.Motion:
            data.type = 'motion';
            data.m_carMotionData = [];
            for (let i = 0; i < 22; i++) {
              data.m_carMotionData.push(this.readCarMotionData(currentPos + 51 + i * 60));
            }
            packetSize = 51 + 22 * 60;
            break;

          case PacketId.Participants:
            data.type = 'participants';
            const numActive = this.view.getUint8(currentPos + 51);
            data.m_numActiveCars = numActive;
            const participants: ParticipantData[] = [];
            for (let i = 0; i < 22; i++) {
              const p = this.readParticipantData(currentPos + 51 + 1 + i * 58);
              if (p.m_aiControlled === 0) {
                participants.push(p);
              }
            }
            data.m_participants = participants;
            packetSize = 51 + 1 + 22 * 58;
            break;

          case PacketId.CarTelemetry:
            data.type = 'car_telemetry';
            data.m_carTelemetryData = [];
            for (let i = 0; i < 22; i++) {
              data.m_carTelemetryData.push(this.readCarTelemetryData(currentPos + 51 + i * 64));
            }
            packetSize = 51 + 22 * 64;
            break;

          case PacketId.Session:
            data.type = 'session';
            packetSize = 753;
            break;

          case PacketId.LapData:
            data.type = 'lap_data';
            // Simplified for now
            packetSize = 51 + 22 * 1285;
            break;

          default:
            packetSize = 1; 
            break;
        }

        if (packetSize > 0) {
          packets.push(data);
          currentPos += packetSize;
        } else {
          currentPos++;
        }
      } catch (e) {
        currentPos++;
      }
    }
    return packets;
  }
}
