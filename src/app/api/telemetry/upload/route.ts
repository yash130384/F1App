import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { run, query } from '@/lib/db';
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
    const leagues = await query<any>(
      `SELECT id, name FROM leagues WHERE owner_id = ? AND (is_completed = false OR is_completed IS NULL) ORDER BY name ASC`,
      [userId]
    );

    return NextResponse.json({ success: true, leagues });
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
    const { leagueId, fileName, fileSize, participants, trackId, sessionType, trackLength, telemetryData } = body;

    if (!leagueId) {
      return NextResponse.json({ error: 'Keine Liga ausgewählt' }, { status: 400 });
    }

    // Sicherheitscheck: User muss Owner der Liga sein
    const leagueRows = await query<any>(
      `SELECT id, name FROM leagues WHERE id = ? AND owner_id = ?`,
      [leagueId, userId]
    );
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
      const matches = await query<any>(
        `SELECT id FROM races WHERE league_id = ? AND track = ? LIMIT 1`,
        [leagueId, trackString]
      );
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
          fs.writeFileSync(filePath, jsonStr);
          blobUrl = `/uploads/telemetry-${sessionId}.json`;
        }
      } catch (err) {
        console.error('JSON Save Error:', err);
      }
    }

    // Session anlegen
    await run(
      `INSERT INTO telemetry_sessions (id, league_id, session_type, is_active, track_flags, created_at, updated_at, track_id, track_length, race_id, blob_url)
       VALUES (?, ?, ?, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?)`,
      [sessionId, leagueId, sType, tId, tLen, raceId, blobUrl]
    );

    // Participants speichern
    let savedCount = 0;
    for (const p of participants) {
      const name = (p.name || '').trim();
      if (!name) continue;

      // Versuch Driver case-insensitiv in dieser Liga zu matchen
      const driverRows = await query<any>(
        `SELECT id FROM drivers WHERE league_id = ? AND LOWER(game_name) = LOWER(?) LIMIT 1`,
        [leagueId, name]
      );
      const driverId = driverRows.length > 0 ? driverRows[0].id : null;

      await run(
        `INSERT INTO telemetry_participants (session_id, game_name, driver_id, team_id, start_position, position, lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time, car_index)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, true, 0, 0, 0, ?)
         ON CONFLICT(session_id, game_name) DO NOTHING`,
        [sessionId, name, driverId, p.teamId ?? null, p.raceNumber ?? 0, p.carIndex ?? 0]
      );
      savedCount++;
    }

    // Wenn SessionType = Race und wir raceId haben, Race Results füllen!
    if (raceId && telemetryData) {
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
            const driverRows = await query<any>(
              `SELECT id FROM drivers WHERE league_id = ? AND LOWER(game_name) = LOWER(?) LIMIT 1`,
              [leagueId, name]
            );
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
              await run(
                `INSERT INTO race_results (id, race_id, driver_id, position, quali_position, fastest_lap, clean_driver, points_earned, is_dnf, pit_stops, warnings, penalties_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(driver_id, race_id) DO UPDATE SET
                   position = EXCLUDED.position,
                   fastest_lap = EXCLUDED.fastest_lap,
                   clean_driver = EXCLUDED.clean_driver,
                   is_dnf = EXCLUDED.is_dnf,
                   pit_stops = EXCLUDED.pit_stops,
                   penalties_time = EXCLUDED.penalties_time`,
                [
                  crypto.randomUUID(),
                  raceId,
                  driverId,
                  resultInfo.m_position, // position
                  resultInfo.m_gridPosition, // quali_position
                  fastestLap,
                  cleanDriver,
                  0, // Points initially 0, until recalculated
                  isDnf,
                  resultInfo.m_numPitStops,
                  resultInfo.m_numPenalties,
                  resultInfo.m_penaltiesTime
                ]
              );
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
