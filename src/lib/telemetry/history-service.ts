import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { telemetrySessions, telemetryParticipants } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function getTelemetryHistory(gameName: string) {
  // Wir suchen alle Sessions, in denen der User als Teilnehmer auftaucht
  // Die Verknüpfung erfolgt über den gameName in den telemetryParticipants
  const history = await db
    .select({
      sessionId: telemetrySessions.id,
      track: telemetrySessions.trackId,
      date: telemetrySessions.createdAt,
      type: telemetrySessions.sessionType,
    })
    .from(telemetrySessions)
    .innerJoin(telemetryParticipants, eq(telemetrySessions.id, telemetryParticipants.sessionId))
    .where(eq(telemetryParticipants.gameName, gameName));

  return history;
}
