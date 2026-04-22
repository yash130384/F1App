export enum PacketId {
  Motion = 0,
  Session = 1,
  LapData = 2,
  Event = 3,
  Participants = 4,
  CarSetups = 5,
  CarTelemetry = 6,
  CarStatus = 7,
  FinalClassification = 8,
  LobbyInfo = 9,
  CarDamage = 10,
  SessionHistory = 11,
  TyreSets = 12,
  MotionEx = 13,
  TimeTrial = 14,
  LapPositions = 15
}

export interface PacketHeader {
  m_packetFormat: number;
  m_gameYear: number;
  m_gameMajorVersion: number;
  m_gameMinorVersion: number;
  m_packetVersion: number;
  m_packetId: number;
  m_sessionUID: number;
  m_sessionTime: number;
  m_frameIdentifier: number;
  m_overallFrameIdentifier: number;
  m_playerCarIndex: number;
  m_secondaryPlayerCarIndex: number;
}

export interface CarMotionData {
  m_worldPositionX: number;
  m_worldPositionY: number;
  m_worldPositionZ: number;
  m_worldVelocityX: number;
  m_worldVelocityY: number;
  m_worldVelocityZ: number;
  m_worldForwardDirX: number;
  m_worldForwardDirY: number;
  m_worldForwardDirZ: number;
  m_worldRightDirX: number;
  m_worldRightDirY: number;
  m_worldRightDirZ: number;
  m_gForceLateral: number;
  m_gForceLongitudinal: number;
  m_gForceVertical: number;
  m_yaw: number;
  m_pitch: number;
  m_roll: number;
}

export interface PacketMotionData {
  header: PacketHeader;
  m_carMotionData: CarMotionData[];
}

export interface ParticipantData {
  m_aiControlled: number;
  m_driverId: number;
  m_networkId: number;
  m_teamId: number;
  m_myTeam: number;
  m_raceNumber: number;
  m_nationality: number;
  m_name: string;
  m_yourTelemetry: number;
  m_showOnlineNames: number;
  m_techLevel: number;
  m_platform: number;
}

export interface PacketParticipantsData {
  header: PacketHeader;
  m_numActiveCars: number;
  m_participants: ParticipantData[];
}

// Add more interfaces as needed for the implementation

export interface CarTelemetryData {
  m_speed: number;
  m_throttle: number;
  m_steer: number;
  m_brake: number;
  m_clutch: number;
  m_gear: number;
  m_engineRPM: number;
  m_drs: number;
  m_revLightsPercent: number;
  m_revLightsBitValue: number;
  m_brakesTemperature: number[];
  m_tyresSurfaceTemperature: number[];
  m_tyresInnerTemperature: number[];
  m_engineTemperature: number;
  m_tyresPressure: number[];
  m_surfaceType: number[];
}

export interface PacketCarTelemetryData {
  header: PacketHeader;
  m_carTelemetryData: CarTelemetryData[];
}

export interface CarStatusData {
  [key: string]: any;
}

export interface PacketCarStatusData {
  header: PacketHeader;
  m_carStatusData: CarStatusData[];
}

export interface CarDamageData {
  [key: string]: any;
}

export interface PacketCarDamageData {
  header: PacketHeader;
  m_carDamageData: CarDamageData[];
}

export interface LapData {
  [key: string]: any;
}

export interface PacketLapData {
  header: PacketHeader;
  m_lapData: LapData[];
}

export interface TyreSetData {
  [key: string]: any;
}

export interface PacketTyreSetsData {
  header: PacketHeader;
  m_tyreSetData: TyreSetData[];
}

export interface FinalClassificationData {
  [key: string]: any;
}

export interface PacketFinalClassificationData {
  header: PacketHeader;
  m_numCars: number;
  m_classificationData: FinalClassificationData[];
}

export interface LobbyInfoData {
  [key: string]: any;
}

export interface PacketLobbyInfoData {
  header: PacketHeader;
  m_numPlayers: number;
  m_lobbyPlayers: LobbyInfoData[];
}

export interface TimeTrialDataSet {
  [key: string]: any;
}

export interface PacketTimeTrialData {
  header: PacketHeader;
  m_playerSessionBestDataSet: TimeTrialDataSet;
  m_personalBestDataSet: TimeTrialDataSet;
  m_rivalDataSet: TimeTrialDataSet;
}
