import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { leagueId: incomingLeagueId, packet } = body;

        if (!incomingLeagueId || !packet) {
            return NextResponse.json({ success: false, error: 'Missing leagueId or packet' }, { status: 400 });
        }

        let leagueId = incomingLeagueId;
        // Translate league name to UUID if it's not a UUID (quick heuristic length != 36)
        if (incomingLeagueId.length !== 36) {
            const leagueRes = await query<any>('SELECT id FROM leagues WHERE name ILIKE ? LIMIT 1', [incomingLeagueId]);
            if (leagueRes.length > 0) {
                leagueId = leagueRes[0].id;
            }
        }

        const { sessionType, trackId, trackLength, isSessionEnded, participants } = packet;

        // 1. Find or create active session
        let activeSession = await query<any>(
            `SELECT id, is_active FROM telemetry_sessions WHERE league_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1`,
            [leagueId]
        );

        let sessionId: string;

        if (activeSession.length === 0) {
            sessionId = crypto.randomUUID();
            await run(
                `INSERT INTO telemetry_sessions (id, league_id, track_id, track_length, session_type, is_active) VALUES (?, ?, ?, ?, ?, true)`,
                [sessionId, leagueId, trackId, trackLength, sessionType]
            );
        } else {
            sessionId = activeSession[0].id;
            // Update last updated time so we know it's still alive. Also update trackLength just in case.
            await run(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP, track_length = ? WHERE id = ?`, [trackLength, sessionId]);
        }

        // 2. Process participants
        if (participants && Array.isArray(participants)) {
            await Promise.all(participants.map(async (p: any) => {
                // Look for an existing mapping in the drivers table
                const foundDriverRow = await query<any>(
                    `SELECT id FROM drivers WHERE league_id = ? AND game_name = ?`,
                    [leagueId, p.gameName]
                );
                const assignedDriverId = foundDriverRow.length > 0 ? foundDriverRow[0].id : null;

                // Upsert participant
                // SQLite allows ON CONFLICT for UPSERT if there is a UNIQUE constraint
                const upsertQuery = `
                    INSERT INTO telemetry_participants 
                    (session_id, game_name, driver_id, team_id, start_position, position, lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(session_id, game_name) DO UPDATE SET
                        position = EXCLUDED.position,
                        lap_distance = EXCLUDED.lap_distance,
                        driver_id = COALESCE(telemetry_participants.driver_id, EXCLUDED.driver_id),
                        top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END,
                        pit_stops = EXCLUDED.pit_stops,
                        warnings = EXCLUDED.warnings,
                        penalties_time = EXCLUDED.penalties_time
                    RETURNING id
                `;

                try {
                    const partRow = await query<any>(upsertQuery,
                        [sessionId, p.gameName, assignedDriverId, p.teamId, p.startPosition, p.position, p.lapDistance, p.topSpeedKmh, p.isHuman, p.pitStops || 0, p.warnings || 0, p.penaltiesTime || 0]
                    );

                    if (partRow.length > 0 && p.laps && Array.isArray(p.laps)) {
                        const participantId = partRow[0].id;

                        const lapPromises = p.laps.map(async (lap: any) => {
                            const existingLap = await query<any>(
                                `SELECT id FROM telemetry_laps WHERE participant_id = ? AND lap_number = ?`,
                                [participantId, lap.lapNumber]
                            );

                            if (existingLap.length === 0) {
                                await run(
                                    `INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap) VALUES (?, ?, ?, ?, ?, ?)`,
                                    [participantId, lap.lapNumber, lap.lapTimeMs, lap.isValid, lap.tyreCompound || null, lap.isPitLap ? true : false]
                                );
                            }
                        });
                        await Promise.all(lapPromises);
                    }
                } catch (dbErr) {
                    console.error("DB UPSERT ERROR for participant:", dbErr);
                }
            }));
        }

        // 3. Handle session end
        if (isSessionEnded) {
            await run(`UPDATE telemetry_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);

            if (sessionType === 'Race') {
                try {
                    const { internalPromoteTelemetryToRace } = await import('@/lib/actions');
                    const { getTrackNameById } = await import('@/lib/constants');
                    const trackName = getTrackNameById(trackId);
                    await internalPromoteTelemetryToRace(leagueId, sessionId, trackName);
                } catch (promoErr) {
                    console.error("Failed to promote telemetry to race:", promoErr);
                }
            }
        }

        return NextResponse.json({ success: true, sessionId });

    } catch (error: any) {
        console.error('Telemetry Processing Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
