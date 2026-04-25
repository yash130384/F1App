import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
    telemetrySessions, 
    telemetryParticipants, 
    telemetryLaps, 
    telemetryStints, 
    telemetryPositionHistory, 
    telemetryIncidents,
    drivers
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ raceId: string }> }) {
    const { raceId } = await params;

    try {
        // 1. Telemetry session identifying
        const [session] = await db.select().from(telemetrySessions).where(eq(telemetrySessions.raceId, raceId)).limit(1);

        if (!session) {
            return NextResponse.json({ success: false, error: 'Keine Telemetrie für dieses Rennen gefunden' }, { status: 404 });
        }

        const sessionId = session.id;

        // 2. Alle Teilnehmer für diese Session
        const participants = await db.select({
            id: telemetryParticipants.id,
            gameName: telemetryParticipants.gameName,
            driverId: telemetryParticipants.driverId,
            driverName: drivers.name,
            position: telemetryParticipants.position,
            teamId: telemetryParticipants.teamId
        })
        .from(telemetryParticipants)
        .leftJoin(drivers, eq(telemetryParticipants.driverId, drivers.id))
        .where(eq(telemetryParticipants.sessionId, sessionId));

        const result: any[] = [];

        for (const p of participants) {
            // Runden-Daten
            const laps = await db.select().from(telemetryLaps)
                .where(eq(telemetryLaps.participantId, p.id))
                .orderBy(telemetryLaps.lapNumber);

            // Stint-Daten
            const stints = await db.select().from(telemetryStints)
                .where(eq(telemetryStints.participantId, p.id))
                .orderBy(telemetryStints.stintNumber);

            result.push({
                ...p,
                laps,
                stints
            });
        }

        // 3. Positionsverlauf
        const positionHistory = await db.select().from(telemetryPositionHistory)
            .where(eq(telemetryPositionHistory.sessionId, sessionId))
            .orderBy(telemetryPositionHistory.lapNumber);

        // 4. Incidents
        const incidents = await db.select().from(telemetryIncidents)
            .where(eq(telemetryIncidents.sessionId, sessionId))
            .orderBy(telemetryIncidents.timestamp);

        return NextResponse.json({
            success: true,
            participants: result,
            positionHistory,
            incidents
        });

    } catch (error: any) {
        console.error('Fehler beim Laden des Lap-Charts:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
