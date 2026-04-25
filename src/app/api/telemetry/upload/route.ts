import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { 
    leagues, 
    races, 
    telemetrySessions, 
    drivers, 
    telemetryParticipants, 
    raceResults 
} from '@/lib/schema';
import { eq, and, or, sql, desc, ilike, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { getTrackNameById } from '@/lib/constants';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// GET: Gibt alle aktiven Ligen zurück, bei denen der User Owner ist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userLeagues = await db.select({ id: leagues.id, name: leagues.name })
      .from(leagues)
      .where(and(
          eq(leagues.ownerId, userId),
          or(eq(leagues.isCompleted, false), isNull(leagues.isCompleted))
      ))
      .orderBy(leagues.name);

    return NextResponse.json({ success: true, leagues: userLeagues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Speichert eine neue Telemetrie-Session für eine Liga (nur Admins)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { leagueId, participants, trackId, sessionType, trackLength, telemetryData } = body;

    if (!leagueId) {
      return NextResponse.json({ error: 'Keine Liga ausgewählt' }, { status: 400 });
    }

    // Sicherheitscheck: User muss Owner der Liga sein
    const leagueRows = await db.select({ id: leagues.id, name: leagues.name })
        .from(leagues)
        .where(and(eq(leagues.id, leagueId), eq(leagues.ownerId, userId)))
        .limit(1);
        
    if (leagueRows.length === 0) {
      return NextResponse.json({ error: 'Keine Admin-Berechtigung für diese Liga' }, { status: 403 });
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Keine Teilnehmer im Payload' }, { status: 400 });
    }

    // Automatische Zuordnung zu einem Rennen, falls das Track-ID passt
    let raceId = null;
    if (trackId !== undefined && trackId !== null) {
      const trackString = getTrackNameById(Number(trackId));
      // Hole Rennen dieser Liga, die zu dieser Strecke passen
      const matches = await db.select({ id: races.id })
        .from(races)
        .where(and(eq(races.leagueId, leagueId), eq(races.track, trackString)))
        .limit(1);
        
      if (matches.length > 0) {
        raceId = matches[0].id;
      }
    }

    const tId = trackId !== undefined ? Number(trackId) : null;
    const sType = sessionType || 'bin_upload';
    const tLen = trackLength || null;

    const sessionId = crypto.randomUUID();

    // 1. JSON Speichern (Vercel Blob oder lokal als Fallback)
    let blobUrl = null;
    if (telemetryData) {
      try {
        const jsonStr = JSON.stringify(telemetryData);
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const blob = await put(`telemetry-${sessionId}.json`, jsonStr, { access: 'public' });
          blobUrl = blob.url;
        } else {
          const filePath = path.join(process.cwd(), 'public', 'uploads', `telemetry-${sessionId}.json`);
          if (!fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))) {
              fs.mkdirSync(path.join(process.cwd(), 'public', 'uploads'), { recursive: true });
          }
          fs.writeFileSync(filePath, jsonStr);
          blobUrl = `/uploads/telemetry-${sessionId}.json`;
        }
      } catch (err) {
        console.error('JSON Save Error:', err);
      }
    }

    // Session anlegen
    await db.insert(telemetrySessions).values({
        id: sessionId,
        leagueId,
        sessionType: sType,
        isActive: false,
        trackFlags: 0,
        trackId: tId,
        trackLength: tLen,
        raceId,
        blobUrl
    });

    // Participants speichern
    let savedCount = 0;
    for (const p of participants) {
      const name = (p.name || '').trim();
      if (!name) continue;

      // Versuch Driver case-insensitiv in dieser Liga zu matchen
      const driverRows = await db.select({ id: drivers.id })
        .from(drivers)
        .where(and(eq(drivers.leagueId, leagueId), ilike(drivers.gameName, name)))
        .limit(1);
        
      const driverId = driverRows.length > 0 ? driverRows[0].id : null;

      await db.insert(telemetryParticipants).values({
          sessionId,
          gameName: name,
          driverId,
          teamId: p.teamId ?? null,
          startPosition: p.raceNumber ?? 0,
          position: 0,
          lapDistance: 0,
          topSpeed: 0,
          isHuman: true,
          pitStops: 0,
          warnings: 0,
          penaltiesTime: 0,
          carIndex: p.carIndex ?? 0
      }).onConflictDoNothing();
      
      savedCount++;
    }

    // Wenn SessionType = Race und wir raceId haben, Race Results füllen!
    if (raceId && telemetryData && Array.isArray(telemetryData)) {
      const finalClassPackets = telemetryData.filter((pkt: any) => pkt.type === 'final_classification');
      if (finalClassPackets.length > 0) {
        const lastFinal = finalClassPackets[finalClassPackets.length - 1]; // Das letzte Packet hat das Endresultat
        const classData = lastFinal.m_classificationData || [];

        // Gehe alle Teilnehmer durch und lege Resultate an
        for (const p of participants) {
          // p.carIndex ist der Index in den Packets!
          if (p.carIndex !== undefined && p.carIndex >= 0 && p.carIndex < classData.length) {
            const resultInfo = classData[p.carIndex];
            if (!resultInfo) continue;

            const name = (p.name || '').trim();
            const driverRows = await db.select({ id: drivers.id })
                .from(drivers)
                .where(and(eq(drivers.leagueId, leagueId), ilike(drivers.gameName, name)))
                .limit(1);
                
            if (driverRows.length > 0) {
              const driverId = driverRows[0].id;
              
              // Result Status: 4=DNF, 5=DSQ, 6=NotClassified, 7=Retired
              const isDnf = [4, 5, 6, 7].includes(resultInfo.m_resultStatus);
              
              // Fastest Lap ermitteln
              let fastestLap = false;
              if (resultInfo.m_bestLapTimeInMS > 0) {
                 // Prüfen ob es die schnellste ist unter allen
                 const allBestTimes = classData.map((d: any) => d.m_bestLapTimeInMS).filter((t: number) => t > 0);
                 const absoluteBest = Math.min(...allBestTimes);
                 if (resultInfo.m_bestLapTimeInMS === absoluteBest) {
                   fastestLap = true;
                 }
              }

              const cleanDriver = resultInfo.m_numPenalties === 0 && resultInfo.m_penaltiesTime === 0;

              // Insert in race_results
              await db.insert(raceResults).values({
                  id: crypto.randomUUID(),
                  raceId,
                  driverId,
                  position: resultInfo.m_position,
                  qualiPosition: resultInfo.m_gridPosition,
                  fastestLap,
                  cleanDriver,
                  pointsEarned: 0,
                  isDnf,
                  pitStops: resultInfo.m_numPitStops,
                  warnings: resultInfo.m_numPenalties,
                  penaltiesTime: resultInfo.m_penaltiesTime
              }).onConflictDoUpdate({
                  target: [raceResults.driverId, raceResults.raceId],
                  set: {
                    position: sql`EXCLUDED.position`,
                    fastestLap: sql`EXCLUDED.fastest_lap`,
                    cleanDriver: sql`EXCLUDED.clean_driver`,
                    isDnf: sql`EXCLUDED.is_dnf`,
                    pitStops: sql`EXCLUDED.pit_stops`,
                    penaltiesTime: sql`EXCLUDED.penalties_time`
                  }
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      leagueName: leagueRows[0].name,
      participantsCount: savedCount,
    });

  } catch (err: any) {
    console.error('[telemetry/upload] Fehler:', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
