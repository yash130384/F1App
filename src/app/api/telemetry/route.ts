import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { leagueId, packet } = body;

        if (!leagueId || !packet) {
            return NextResponse.json({ success: false, error: 'Missing leagueId or packet' }, { status: 400 });
        }

        const { sessionType, trackId, isSessionEnded, participants } = packet;

        // 1. Find or create active session
        let activeSession = await query<any>(
            `SELECT id, is_active FROM telemetry_sessions WHERE league_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1`,
            [leagueId]
        );

        let sessionId: string;

        if (activeSession.length === 0) {
            sessionId = crypto.randomUUID();
            await run(
                `INSERT INTO telemetry_sessions (id, league_id, track_id, session_type, is_active) VALUES (?, ?, ?, ?, true)`,
                [sessionId, leagueId, trackId, sessionType]
            );
        } else {
            sessionId = activeSession[0].id;
            // Update last updated time so we know it's still alive
            await run(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);
        }

        // 2. Process participants
        if (participants && Array.isArray(participants)) {
            for (const p of participants) {
                // Upsert participant
                // SQLite allows ON CONFLICT for UPSERT if there is a UNIQUE constraint
                await run(
                    `INSERT INTO telemetry_participants 
                    (session_id, game_name, team_id, start_position, position, top_speed, is_human)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(session_id, game_name) DO UPDATE SET
                        position = EXCLUDED.position,
                        top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END
                    `,
                    [sessionId, p.gameName, p.teamId, p.startPosition, p.position, p.topSpeedKmh, p.isHuman]
                );

                // We need the participant ID to insert laps
                const partRow = await query<any>(
                    `SELECT id FROM telemetry_participants WHERE session_id = ? AND game_name = ?`,
                    [sessionId, p.gameName]
                );

                if (partRow.length > 0 && p.laps && Array.isArray(p.laps)) {
                    const participantId = partRow[0].id;

                    for (const lap of p.laps) {
                        // Insert the lap if it doesn't exist for this driver and lap number
                        const existingLap = await query<any>(
                            `SELECT id FROM telemetry_laps WHERE participant_id = ? AND lap_number = ?`,
                            [participantId, lap.lapNumber]
                        );

                        if (existingLap.length === 0) {
                            await run(
                                `INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid) VALUES (?, ?, ?, ?)`,
                                [participantId, lap.lapNumber, lap.lapTimeMs, lap.isValid]
                            );
                        }
                    }
                }
            }
        }

        // 3. Handle session end
        if (isSessionEnded) {
            await run(`UPDATE telemetry_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);

            // Optional: Automatically promote to an official race if it's a Race session type.
            // (Implemented as manual for now, see actions.ts)
        }

        return NextResponse.json({ success: true, sessionId });

    } catch (error: any) {
        console.error('Telemetry Processing Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
