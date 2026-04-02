import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';
import { updateLiveState } from '@/app/api/live/store';
import crypto from 'crypto';

// In-memory queue zur sequentiellen Abarbeitung von DB-Requests (besonders Neon-Tolerant)
const processingQueue: any[] = [];
let isProcessorRunning = false;
const leagueCache = new Map<string, { id: string, name: string }>();

/**
 * Der API-Endpoint zur Abfrage der aktuellen Queue-Größe.
 */
export async function GET() {
    return NextResponse.json({ queue: processingQueue.length });
}

/**
 * Der POST-Endpoint nimmt Telemetrie-Pakete entgegen und schiebt sie in die Queue.
 */
export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const body = await req.json();
        const { leagueId, packet } = body;

        if (!leagueId || !packet) {
            return NextResponse.json({ success: false, error: 'Fehlende leagueId oder packet' }, { status: 400 });
        }

        // Live-Update (Wird sofort ausgeführt, da In-Memory und schnell)
        try {
            if (packet.participants && Array.isArray(packet.participants)) {
                const livePlayers = packet.participants.map((p: any) => {
                    const t = p.telemetry || {};
                    const s = p.status || {};
                    const d = p.damage || {};
                    const m = p.motion || {};
                    const l = p.lapInfo || {};
                    const ss = p.sessionStatus || {};
                    return {
                        gameName: p.gameName,
                        position: p.position ?? 0,
                        lapDistance: p.lapDistance ?? 0,
                        isHuman: p.isHuman ?? false,
                        teamId: p.teamId ?? 0,
                        pitStops: p.pitStops ?? 0,
                        warnings: p.warnings ?? 0,
                        penaltiesTime: p.penaltiesTime ?? 0,
                        ...t, ...s, ...d, ...m, ...l, ...ss,
                        tyreSets: p.tyreSets
                    };
                });
                
                updateLiveState({
                    leagueId: leagueId,
                    leagueName: 'Active Session',
                    sessionType: packet.sessionType ?? 'Unknown',
                    trackId: packet.trackId ?? -1,
                    trackLength: packet.trackLength ?? 0,
                    timestamp: Date.now(),
                    players: livePlayers,
                    incidentLog: packet.incidentLog || [],
                    trackFlags: packet.trackFlags || 0,
                    sessionData: packet.sessionData
                });
            }
        } catch (liveErr) {
            console.warn('Live-Update Skip:', liveErr);
        }

        // DB-WORKER TRIGGER (Warteschlange)
        processingQueue.push(body);
        triggerWorker().catch(e => console.error('Worker-Startup-Fehler:', e));

        return NextResponse.json({ 
            success: true, 
            status: 'queued', 
            queue: processingQueue.length,
            duration: `${Date.now() - startTime}ms` 
        });

    } catch (error: any) {
        console.error('Telemetrie-Request Fehler:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * Der Hintergrund-Worker verarbeitet die Warteschlange.
 */
async function triggerWorker() {
    if (isProcessorRunning) return;
    isProcessorRunning = true;

    try {
        console.log(`📡 [WORKER] Start: ${processingQueue.length} Chunks in der Queue.`);
        while (processingQueue.length > 0) {
            const body = processingQueue.shift();
            if (!body) continue;

            try {
                const startTime = Date.now();
                await handleHeavyProcessing(body);
                const duration = Date.now() - startTime;
                if (processingQueue.length % 5 === 0) {
                    console.log(`✅ [WORKER] Chunk verarbeitet (${duration}ms). Verbleibend: ${processingQueue.length}`);
                }
            } catch (error: any) {
                console.error('❌ [WORKER] Fehler bei Verarbeitung:', error.message);
            }
        }
        console.log('🏁 [WORKER] Warteschlange abgearbeitet.');
    } finally {
        isProcessorRunning = false;
    }
}

/**
 * Die schwere DB-Logik (Original-Logik aber sequentiell im Worker).
 */
async function handleHeavyProcessing(body: any) {
    const { leagueId: incomingLeagueId, packet } = body;
    let leagueId = incomingLeagueId;

    // 1. Liga-ID auflösen (mit Cache)
    if (leagueCache.has(incomingLeagueId)) {
        leagueId = leagueCache.get(incomingLeagueId)!.id;
    } else {
        const leagueRes = await query<any>('SELECT id, name FROM leagues WHERE id = ? OR name ILIKE ? LIMIT 1', [incomingLeagueId, incomingLeagueId]);
        if (leagueRes.length > 0) {
            leagueId = leagueRes[0].id;
            leagueCache.set(incomingLeagueId, { id: leagueId, name: leagueRes[0].name });
        }
    }

    const { sessionType, trackId, trackLength, isSessionEnded, participants, safetyCarEvents, lapPositions, incidentLog, trackFlags } = packet;

    // 2. Session ermitteln
    let activeSession = await query<any>(
        `SELECT id FROM telemetry_sessions WHERE league_id = ? AND is_active = true ORDER BY created_at DESC LIMIT 1`,
        [leagueId]
    );

    let sessionId: string;

    if (activeSession.length === 0) {
        sessionId = crypto.randomUUID();
        const tm = packet.trackMetadata;
        await run(
            `INSERT INTO telemetry_sessions (id, league_id, track_id, track_length, session_type, is_active, track_flags, pit_entry, pit_exit) VALUES (?, ?, ?, ?, ?, true, ?, ?, ?)`,
            [sessionId, leagueId, trackId, trackLength, sessionType, trackFlags || 0, tm?.pitEntry || null, tm?.pitExit || null]
        );
        
        // Track-Metadaten mitspeichern (Kurven)
        if (tm?.turns && Array.isArray(tm.turns)) {
             await Promise.all(tm.turns.map((turn: any) => 
                run('INSERT INTO telemetry_track_metadata (id, track_id, curve_name, distance_start, distance_end) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
                    [crypto.randomUUID(), trackId, turn.name, turn.start, turn.end])
            ));
        }
    } else {
        sessionId = activeSession[0].id;
    }

    // 3. Metadaten-Updates (Parallelisiert)
    const tasks: Promise<any>[] = [];
    tasks.push(run(`UPDATE telemetry_sessions SET updated_at = CURRENT_TIMESTAMP, track_length = ?, track_flags = ? WHERE id = ?`, [trackLength, trackFlags || 0, sessionId]));

    if (safetyCarEvents?.length) {
        tasks.push(...safetyCarEvents.map((evt: any) => run(`INSERT INTO telemetry_safety_car_events (id, session_id, safety_car_type, event_type, lap_number) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), sessionId, evt.safetyCarType, evt.eventType, evt.lapNumber])));
    }

    if (incidentLog?.length) {
        tasks.push(...incidentLog.map((inc: any) => run(`INSERT INTO telemetry_incidents (id, session_id, type, details, vehicle_idx, other_vehicle_idx, lap_num, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), sessionId, inc.type, inc.details, inc.vehicleIdx, inc.otherVehicleIdx, inc.lapNum, new Date(inc.timestamp).toISOString()])));
    }

    if (lapPositions?.length) {
        tasks.push(...lapPositions.filter((lp: any) => lp.position > 0).map((lp: any) => run(`INSERT INTO telemetry_position_history (id, session_id, car_index, lap_number, position) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), sessionId, lp.carIndex, lp.lapNumber, lp.position])));
    }

    await Promise.all(tasks);

    // 4. Teilnehmer verarbeiten
    if (participants && Array.isArray(participants)) {
        for (const p of participants) {
            const foundDriverRow = await query<any>(`SELECT id FROM drivers WHERE league_id = ? AND game_name = ?`, [leagueId, p.gameName]);
            const assignedDriverId = foundDriverRow.length > 0 ? foundDriverRow[0].id : null;

            const partRes = await query<any>(`
                INSERT INTO telemetry_participants (session_id, game_name, driver_id, team_id, start_position, position, lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time, car_index, visual_tyre_compound, actual_tyre_compound, tyre_age_laps, engine_power_ice, engine_power_mguk, total_race_time, penalties_count, steering_assist, braking_assist, gearbox_assist, traction_control, anti_lock_brakes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(session_id, game_name) DO UPDATE SET
                    position = EXCLUDED.position, car_index = EXCLUDED.car_index, lap_distance = EXCLUDED.lap_distance,
                    driver_id = COALESCE(telemetry_participants.driver_id, EXCLUDED.driver_id),
                    top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END,
                    pit_stops = EXCLUDED.pit_stops, warnings = EXCLUDED.warnings, penalties_time = EXCLUDED.penalties_time,
                    visual_tyre_compound = EXCLUDED.visual_tyre_compound, actual_tyre_compound = EXCLUDED.actual_tyre_compound,
                    tyre_age_laps = EXCLUDED.tyre_age_laps, engine_power_ice = EXCLUDED.engine_power_ice,
                    engine_power_mguk = EXCLUDED.engine_power_mguk, total_race_time = COALESCE(EXCLUDED.total_race_time, telemetry_participants.total_race_time),
                    penalties_count = COALESCE(EXCLUDED.penalties_count, telemetry_participants.penalties_count),
                    steering_assist = EXCLUDED.steering_assist, braking_assist = EXCLUDED.braking_assist,
                    gearbox_assist = EXCLUDED.gearbox_assist, traction_control = EXCLUDED.traction_control, anti_lock_brakes = EXCLUDED.anti_lock_brakes
                RETURNING id`,
                [
                    sessionId, p.gameName, assignedDriverId, p.teamId, p.startPosition, p.position, p.lapDistance, p.topSpeedKmh, p.isHuman, p.pitStops || 0, p.warnings || 0, p.penaltiesTime || 0, p.carIndex,
                    p.status?.visualTyreCompound || null, p.status?.actualTyreCompound || null, p.status?.tyresAgeLaps || 0, p.status?.enginePowerICE || 0, p.status?.enginePowerMGUK || 0,
                    p.totalRaceTime || null, p.penaltiesCount || 0,
                    p.status?.steeringAssist === 1, p.status?.brakingAssist || 0, p.status?.gearboxAssist || 0,
                    p.status?.tractionControl || 0, p.status?.antiLockBrakes === 1
                ]
            );

            if (partRes.length > 0 && p.isHuman) {
                const participantId = partRes[0].id;
                
                if (p.laps && Array.isArray(p.laps)) {
                    for (const lap of p.laps) {
                        const existingLap = await query<any>(`SELECT id FROM telemetry_laps WHERE participant_id = ? AND lap_number = ?`, [participantId, lap.lapNumber]);
                        if (existingLap.length === 0) {
                            const lapRow = await query<any>(
                                `INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms, car_damage_json)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                                [participantId, lap.lapNumber, lap.lapTimeMs, lap.isValid, lap.tyreCompound || null, lap.isPitLap, lap.sector1Ms, lap.sector2Ms, lap.sector3Ms, JSON.stringify(lap.carDamage)]
                            );
                            if (lapRow.length > 0 && lap.samples) {
                                await run(`INSERT INTO telemetry_lap_samples (lap_id, samples_json) VALUES (?, ?) ON CONFLICT DO NOTHING`, [lapRow[0].id, JSON.stringify(lap.samples)]);
                            }
                        }
                    }
                }
                
                const pTasks: Promise<any>[] = [];
                if (p.tyreSets) pTasks.push(...p.tyreSets.map((ts: any) => run(`INSERT INTO telemetry_tyre_sets (id, participant_id, actual_tyre_compound, wear, life_span) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), participantId, ts.actualTyreCompound, ts.wear, ts.lifeSpan])));
                if (p.setup) pTasks.push(run(`INSERT INTO telemetry_car_setups (id, participant_id, setup_json) VALUES (?,?,?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), participantId, JSON.stringify(p.setup)]));
                if (p.speedTraps) pTasks.push(...p.speedTraps.map((st: any) => run(`INSERT INTO telemetry_speed_traps (id, session_id, participant_id, speed, lap_number, distance) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING`, [crypto.randomUUID(), sessionId, participantId, st.speed, st.lapNum, st.distance])));
                await Promise.all(pTasks);
            }
        }
    }

    // 5. Session-Ende Logik
    if (isSessionEnded) {
        await run(`UPDATE telemetry_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sessionId]);
        if (sessionType === 'Race') {
            try {
                const { internalPromoteTelemetryToRace } = await import('@/lib/actions');
                await internalPromoteTelemetryToRace(leagueId, sessionId, 'F1-Replay');
            } catch (promoErr) {
                console.error("Promote-Fehler im Worker:", promoErr);
            }
        }
    }
}
