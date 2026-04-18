import { PacketId } from './types';

export const MAX_CARS = 22;

export enum PacketType {
  Motion = PacketId.Motion,
  Session = PacketId.Session,
  LapData = PacketId.LapData,
  Event = PacketId.Event,
  Participants = PacketId.Participants,
  CarSetups = PacketId.CarSetups,
  CarTelemetry = PacketId.CarTelemetry,
  CarStatus = PacketId.CarStatus,
  FinalClassification = PacketId.FinalClassification,
  LobbyInfo = PacketId.LobbyInfo,
  CarDamage = PacketId.CarDamage,
  SessionHistory = PacketId.SessionHistory,
  TyreSets = PacketId.TyreSets,
  MotionEx = PacketId.MotionEx,
  TimeTrial = PacketId.TimeTrial,
  LapPositions = PacketId.LapPositions
}
