import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
    leagues, 
    telemetrySessions, 
    telemetryParticipants, 
    telemetryLaps, 
    telemetryLapSamples,
    telemetryPositionHistory,
    telemetryIncidents,
    telemetrySafetyCarEvents,
    telemetryTrackMetadata,
    telemetryTyreSets,
    telemetryCarSetups,
    telemetrySpeedTraps,
    drivers
} from '@/lib/schema';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
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
        const leagueRes = await db.select({ id: leagues.id, name: leagues.name })
            .from(leagues)
            .where(or(eq(leagues.id, incomingLeagueId), ilike(leagues.name, incomingLeagueId)))
            .limit(1);
            
        if (leagueRes.length > 0) {
            leagueId = leagueRes[0].id;
            leagueCache.set(incomingLeagueId, { id: leagueId, name: leagueRes[0].name });
        }
    }

    const { sessionType, trackId, trackLength, isSessionEnded, participants, safetyCarEvents, lapPositions, incidentLog, trackFlags } = packet;

    // 2. Session ermitteln
    const activeSessions = await db.select({ id: telemetrySessions.id })
        .from(telemetrySessions)
        .where(and(eq(telemetrySessions.leagueId, leagueId), eq(telemetrySessions.isActive, true)))
        .orderBy(desc(telemetrySessions.createdAt))
        .limit(1);

    let sessionId: string;

    if (activeSessions.length === 0) {
        sessionId = crypto.randomUUID();
        const tm = packet.trackMetadata;
        await db.insert(telemetrySessions).values({
            id: sessionId,
            leagueId,
            trackId,
            trackLength,
            sessionType,
            isActive: true,
            trackFlags: trackFlags || 0,
            pitEntry: tm?.pitEntry || null,
            pitExit: tm?.pitExit || null
        });
        
        // Track-Metadaten mitspeichern (Kurven)
        if (tm?.turns && Array.isArray(tm.turns)) {
             await Promise.all(tm.turns.map((turn: any) => 
                db.insert(telemetryTrackMetadata).values({
                    id: crypto.randomUUID(),
                    trackId,
                    curveName: turn.name,
                    distanceStart: turn.start,
                    distanceEnd: turn.end
                }).onConflictDoNothing()
            ));
        }
    } else {
        sessionId = activeSessions[0].id;
    }

    // 3. Metadaten-Updates (Parallelisiert)
    const tasks: Promise<any>[] = [];
    tasks.push(db.update(telemetrySessions)
        .set({ trackLength, trackFlags: trackFlags || 0, updatedAt: new Date() })
        .where(eq(telemetrySessions.id, sessionId)));

    if (safetyCarEvents?.length) {
        tasks.push(...safetyCarEvents.map((evt: any) => 
            db.insert(telemetrySafetyCarEvents).values({
                id: crypto.randomUUID(),
                sessionId,
                safetyCarType: evt.safetyCarType,
                eventType: evt.eventType,
                lapNumber: evt.lapNumber
            }).onConflictDoNothing()
        ));
    }

    if (incidentLog?.length) {
        tasks.push(...incidentLog.map((inc: any) => 
            db.insert(telemetryIncidents).values({
                id: crypto.randomUUID(),
                sessionId,
                type: inc.type,
                details: inc.details,
                vehicleIdx: inc.vehicleIdx,
                otherVehicleIdx: inc.otherVehicleIdx,
                lapNum: inc.lapNum,
                timestamp: new Date(inc.timestamp)
            }).onConflictDoNothing()
        ));
    }

    if (lapPositions?.length) {
        tasks.push(...lapPositions.filter((lp: any) => lp.position > 0).map((lp: any) => 
            db.insert(telemetryPositionHistory).values({
                id: crypto.randomUUID(),
                sessionId,
                carIndex: lp.carIndex,
                lapNumber: lp.lapNumber,
                position: lp.position
            }).onConflictDoNothing()
        ));
    }

    await Promise.all(tasks);

    // 4. Teilnehmer verarbeiten
    if (participants && Array.isArray(participants)) {
        for (const p of participants) {
            const foundDriverRow = await db.select({ id: drivers.id })
                .from(drivers)
                .where(and(eq(drivers.leagueId, leagueId), eq(drivers.gameName, p.gameName)))
                .limit(1);
            const assignedDriverId = foundDriverRow.length > 0 ? foundDriverRow[0].id : null;

            const partRes = await db.insert(telemetryParticipants).values({
                sessionId,
                gameName: p.gameName,
                driverId: assignedDriverId,
                teamId: p.teamId,
                startPosition: p.startPosition,
                position: p.position,
                lapDistance: p.lapDistance,
                topSpeed: p.topSpeedKmh,
                isHuman: p.isHuman,
                pitStops: p.pitStops || 0,
                warnings: p.warnings || 0,
                penaltiesTime: p.penaltiesTime || 0,
                carIndex: p.carIndex,
                visualTyreCompound: p.status?.visualTyreCompound || null,
                actualTyreCompound: p.status?.actualTyreCompound || null,
                tyreAgeLaps: p.status?.tyresAgeLaps || 0,
                enginePowerICE: p.status?.enginePowerICE || 0,
                enginePowerMGUK: p.status?.enginePowerMGUK || 0,
                totalRaceTime: p.totalRaceTime || null,
                penaltiesCount: p.penaltiesCount || 0,
                steeringAssist: p.status?.steeringAssist === 1,
                brakingAssist: p.status?.brakingAssist || 0,
                gearboxAssist: p.status?.gearboxAssist || 0,
                tractionControl: p.status?.tractionControl || 0,
                antiLockBrakes: p.status?.antiLockBrakes === 1
            }).onConflictDoUpdate({
                target: [telemetryParticipants.sessionId, telemetryParticipants.gameName],
                set: {
                    position: sql`EXCLUDED.position`,
                    carIndex: sql`EXCLUDED.car_index`,
                    lapDistance: sql`EXCLUDED.lap_distance`,
                    driverId: sql`COALESCE(telemetry_participants.driver_id, EXCLUDED.driver_id)`,
                    topSpeed: sql`CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END`,
                    pitStops: sql`EXCLUDED.pit_stops`,
                    warnings: sql`EXCLUDED.warnings`,
                    penaltiesTime: sql`EXCLUDED.penalties_time`,
                    visualTyreCompound: sql`EXCLUDED.visual_tyre_compound`,
                    actualTyreCompound: sql`EXCLUDED.actual_tyre_compound`,
                    tyreAgeLaps: sql`EXCLUDED.tyre_age_laps`,
                    enginePowerICE: sql`EXCLUDED.engine_power_ice`,
                    enginePowerMGUK: sql`EXCLUDED.engine_power_mguk`,
                    totalRaceTime: sql`COALESCE(EXCLUDED.total_race_time, telemetry_participants.total_race_time)`,
                    penaltiesCount: sql`COALESCE(EXCLUDED.penalties_count, telemetry_participants.penalties_count)`,
                    steeringAssist: sql`EXCLUDED.steering_assist`,
                    brakingAssist: sql`EXCLUDED.braking_assist`,
                    gearboxAssist: sql`EXCLUDED.gearbox_assist`,
                    tractionControl: sql`EXCLUDED.traction_control`,
                    antiLockBrakes: sql`EXCLUDED.anti_lock_brakes`
                }
            }).returning({ id: telemetryParticipants.id });

            if (partRes.length > 0 && p.isHuman) {
                const participantId = partRes[0].id;
                
                if (p.laps && Array.isArray(p.laps)) {
                    for (const lap of p.laps) {
                        const existingLap = await db.select({ id: telemetryLaps.id })
                            .from(telemetryLaps)
                            .where(and(eq(telemetryLaps.participantId, participantId), eq(telemetryLaps.lapNumber, lap.lapNumber)))
                            .limit(1);
                        
                        if (existingLap.length === 0) {
                            const lapRow = await db.insert(telemetryLaps).values({
                                participantId,
                                lapNumber: lap.lapNumber,
                                lapTimeMs: lap.lapTimeMs,
                                isValid: lap.isValid,
                                tyreCompound: lap.tyreCompound || null,
                                isPitLap: lap.isPitLap,
                                sector1Ms: lap.sector1Ms,
                                sector2Ms: lap.sector2Ms,
                                sector3Ms: lap.sector3Ms,
                                carDamageJson: JSON.stringify(lap.carDamage)
                            }).returning({ id: telemetryLaps.id });
                            
                            if (lapRow.length > 0 && lap.samples) {
                                await db.insert(telemetryLapSamples).values({
                                    lapId: lapRow[0].id,
                                    samplesJson: JSON.stringify(lap.samples)
                                }).onConflictDoNothing();
                            }
                        }
                    }
                }
                
                const pTasks: Promise<any>[] = [];
                if (p.tyreSets) pTasks.push(...p.tyreSets.map((ts: any) => 
                    db.insert(telemetryTyreSets).values({
                        id: crypto.randomUUID(),
                        participantId,
                        actualTyreCompound: ts.actualTyreCompound,
                        wear: ts.wear,
                        lifeSpan: ts.lifeSpan
                    }).onConflictDoNothing()
                ));
                if (p.setup) pTasks.push(db.insert(telemetryCarSetups).values({
                    id: crypto.randomUUID(),
                    participantId,
                    lapNumber: p.lapInfo?.lapNumber || 0,
                    setupJson: JSON.stringify(p.setup)
                }).onConflictDoNothing());
                if (p.speedTraps) pTasks.push(...p.speedTraps.map((st: any) => 
                    db.insert(telemetrySpeedTraps).values({
                        id: crypto.randomUUID(),
                        sessionId,
                        participantId,
                        speed: st.speed,
                        lapNumber: st.lapNum,
                        distance: st.distance
                    }).onConflictDoNothing()
                ));
                await Promise.all(pTasks);
            }
        }
    }

    // 5. Session-Ende Logik
    if (isSessionEnded) {
        await db.update(telemetrySessions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(telemetrySessions.id, sessionId));
            
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
