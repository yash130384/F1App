import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { leagueId: incomingLeagueId, packet } = body;

        if (!incomingLeagueId || !packet) {
            return NextResponse.json({ success: false, error: 'Fehlende leagueId oder packet' }, { status: 400 });
        }

        let leagueId = incomingLeagueId;
        if (incomingLeagueId.length !== 36) {
            const leagueRes = await query<any>('SELECT id FROM leagues WHERE name ILIKE ? LIMIT 1', [incomingLeagueId]);
            if (leagueRes.length > 0) {
                leagueId = leagueRes[0].id;
            }
        }

        const { sessionType, trackId, trackLength, isSessionEnded, participants, safetyCarEvents, lapPositions } = packet;

        // 1. Aktive Session suchen oder neu anlegen
        let activeSession = await query<any>(
            `SELECT id, is_active FROM telemetry_sessions 
             WHERE league_id = ? 
             AND is_active = true 
             AND updated_at > NOW() - INTERVAL '2 minutes'
             ORDER BY created_at DESC LIMIT 1`,
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
            await run(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP, track_length = ? WHERE id = ?`, [trackLength, sessionId]);
        }

        // 2. Safety-Car-Events speichern (aus dem Router-Payload)
        if (safetyCarEvents && Array.isArray(safetyCarEvents) && safetyCarEvents.length > 0) {
            for (const evt of safetyCarEvents) {
                // Duplikate vermeiden (gleiche Runde + Typ)
                const existing = await query<any>(
                    `SELECT id FROM telemetry_safety_car_events WHERE session_id = ? AND lap_number = ? AND safety_car_type = ? AND event_type = ?`,
                    [sessionId, evt.lapNumber, evt.safetyCarType, evt.eventType]
                );
                if (existing.length === 0) {
                    await run(
                        `INSERT INTO telemetry_safety_car_events (id, session_id, safety_car_type, event_type, lap_number) VALUES (?, ?, ?, ?, ?)`,
                        [crypto.randomUUID(), sessionId, evt.safetyCarType, evt.eventType, evt.lapNumber]
                    );
                }
            }
        }

        // 3. Positionsverlauf aus LapPositions-Paket (ID 15) speichern
        if (lapPositions && Array.isArray(lapPositions) && lapPositions.length > 0) {
            for (const lp of lapPositions) {
                if (!lp.position || lp.position === 0) continue;
                const existing = await query<any>(
                    `SELECT id FROM telemetry_position_history WHERE session_id = ? AND car_index = ? AND lap_number = ?`,
                    [sessionId, lp.carIndex, lp.lapNumber]
                );
                if (existing.length === 0) {
                    await run(
                        `INSERT INTO telemetry_position_history (id, session_id, car_index, lap_number, position) VALUES (?, ?, ?, ?, ?)`,
                        [crypto.randomUUID(), sessionId, lp.carIndex, lp.lapNumber, lp.position]
                    );
                }
            }
        }

        // 4. Teilnehmer verarbeiten
        if (participants && Array.isArray(participants)) {
            await Promise.all(participants.map(async (p: any) => {
                const foundDriverRow = await query<any>(
                    `SELECT id FROM drivers WHERE league_id = ? AND game_name = ?`,
                    [leagueId, p.gameName]
                );
                const assignedDriverId = foundDriverRow.length > 0 ? foundDriverRow[0].id : null;

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

                    // Nur Runden menschlicher Fahrer speichern
                    if (partRow.length > 0 && p.isHuman && p.laps && Array.isArray(p.laps)) {
                        const participantId = partRow[0].id;

                        const lapPromises = p.laps.map(async (lap: any) => {
                            const existingLap = await query<any>(
                                `SELECT id FROM telemetry_laps WHERE participant_id = ? AND lap_number = ?`,
                                [participantId, lap.lapNumber]
                            );

                            if (existingLap.length === 0) {
                                // Schadens-JSON für diese Runde
                                const damageJson = lap.carDamage && (
                                    lap.carDamage.frontLeftWingDamage > 0 ||
                                    lap.carDamage.frontRightWingDamage > 0 ||
                                    lap.carDamage.rearWingDamage > 0 ||
                                    lap.carDamage.floorDamage > 0 ||
                                    lap.carDamage.gearBoxDamage > 0 ||
                                    lap.carDamage.engineDamage > 0 ||
                                    lap.carDamage.engineBlown > 0 ||
                                    lap.carDamage.engineSeized > 0
                                ) ? JSON.stringify(lap.carDamage) : null;

                                await run(
                                    `INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms, car_damage_json)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        participantId,
                                        lap.lapNumber,
                                        lap.lapTimeMs,
                                        lap.isValid,
                                        lap.tyreCompound || null,
                                        lap.isPitLap ? true : false,
                                        lap.sector1Ms || null,
                                        lap.sector2Ms || null,
                                        lap.sector3Ms || null,
                                        damageJson
                                    ]
                                );
                            }
                        });
                        await Promise.all(lapPromises);
                    }
                } catch (dbErr) {
                    console.error("DB-Fehler für Teilnehmer:", dbErr);
                }
            }));
        }

        // 5. Session-Ende verarbeiten
        if (isSessionEnded) {
            await run(`UPDATE telemetry_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);

            if (sessionType === 'Race') {
                try {
                    const { internalPromoteTelemetryToRace } = await import('@/lib/actions');
                    const { getTrackNameById } = await import('@/lib/constants');
                    const trackName = getTrackNameById(trackId);
                    await internalPromoteTelemetryToRace(leagueId, sessionId, trackName);
                } catch (promoErr) {
                    console.error("Fehler beim Promoten der Telemetrie:", promoErr);
                }
            }
        }

        return NextResponse.json({ success: true, sessionId });

    } catch (error: any) {
        console.error('Telemetrie-Verarbeitungsfehler:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
