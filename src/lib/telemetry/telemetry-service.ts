import { db } from '@/lib/db';
import { 
  telemetrySessions, 
  telemetryParticipants, 
  telemetryLaps, 
  telemetryStints, 
  telemetryLapSamples 
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { drivers } from '@/lib/schema';

interface ParsedSessionData {
  header: any;
  participants: any[];
  motionPackets: any[];
  telemetryPackets: any[];
  lapDataPackets: any[];
}

export class TelemetryService {
  /**
   * Verarbeitet ein vollständig geparstes Telemetrie-Objekt und speichert es in der DB.
   * Nutzt Transaktionen für ACID-Garantie.
   */
  async saveFullSession(
    leagueId: string,
    raceId: string,
    trackId: number,
    parsedData: ParsedSessionData
  ) {
    const { header, participants, motionPackets, telemetryPackets, lapDataPackets } = parsedData;

    return await db.transaction(async (tx: any) => {
      // 1. Create/Update Telemetry Session
      const [session] = await tx.insert(telemetrySessions).values({
        leagueId,
        raceId,
        trackId,
        sessionType: 'race',
        isActive: true,
        trackFlags: 0,
      }).returning();

      // 2. Process Participants (Humans Only)
      const participantMap = new Map<string, string>(); // gameName -> sessionId

      for (const p of participants) {
        // Find Driver in DB
        const [driver] = await tx.select().from(drivers).where(eq(drivers.gameName, p.m_name)).limit(1);
        
        if (driver) {
          const [participant] = await tx.insert(telemetryParticipants).values({
            sessionId: session.id,
            driverId: driver.id,
            gameName: p.m_name,
            teamId: p.m_teamId || null,
            startPosition: p.m_raceNumber || 0,
            isHuman: true,
          }).returning();
          
          participantMap.set(p.m_name, participant.id);
        }
      }

      return session.id;
    });
  }

  /**
   * Hilfsmethode zum Abruf der Historie eines Spielers
   */
  async getPlayerHistory(gameName: string) {
    return await db
      .select()
      .from(telemetryParticipants)
      .where(eq(telemetryParticipants.gameName, gameName));
  }
}

export const telemetryService = new TelemetryService();
