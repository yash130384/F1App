'use server';

import { db } from '@/lib/db';
import { telemetrySessions, telemetryParticipants } from '@/lib/schema';
import { auth } from '@/lib/auth'; // Assuming auth utility exists
import { telemetryService } from '@/lib/telemetry/telemetry-service';

export type ParsedTelemetryPayload = {
  leagueId: string;
  raceId: string;
  trackId: number;
  sessionData: any;
};

export async function uploadTelemetrySession(payload: ParsedTelemetryPayload) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  try {
    // Use the service we already implemented
    const sessionId = await telemetryService.saveFullSession(
      payload.leagueId,
      payload.raceId,
      payload.trackId,
      payload.sessionData
    );

    return { success: true, sessionId };
  } catch (error) {
    console.error('Telemetry upload error:', error);
    throw new Error('Failed to save telemetry data');
  }
}
