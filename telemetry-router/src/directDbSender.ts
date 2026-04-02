import sql, { query } from './db';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * High-Performance ECO-Sender.
 * Optimiert für minimalste Latenz durch Batching und Caching.
 */
export class DirectDbSender {
    private leagueId: string;
    private sessionId: string | null = null;
    private leagueCache = new Map<string, string>();
    private driverCache = new Map<string, string>(); // gameName -> driverId
    private humanLapsAccumulator = new Map<number, any[]>();
    private MAX_INT32 = 2147483647;

    constructor(leagueId: string) {
        this.leagueId = leagueId;
    }

    private log(msg: string, type: 'info' | 'error' = 'info') {
        const timestamp = new Date().toISOString();
        const logPath = path.join(process.cwd(), 'eco_router.log');
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
        if (type === 'error') console.error(`❌ ${msg}`);
        else console.log(`[ECO] ${msg}`);
    }

    private safeInt(val: any, defaultVal: any = 0): number | null {
        const n = parseInt(val);
        if (isNaN(n) || n > this.MAX_INT32 || n < -this.MAX_INT32) return defaultVal;
        return n;
    }

    public async processPayload(packet: any) {
        try {
            const resolvedLeagueId = await this.resolveLeagueId();
            if (!resolvedLeagueId) throw new Error(`Liga ${this.leagueId} nicht in DB.`);

            const { sessionType, trackId, trackLength, isSessionEnded, participants, trackFlags, trackMetadata } = packet;

            // 1. Session-Check & Init (nur einmalig oder bei Bedarf)
            if (!this.sessionId) {
                const activeRes = await query`SELECT id FROM telemetry_sessions WHERE league_id = ${resolvedLeagueId} AND is_active = true ORDER BY created_at DESC LIMIT 1`;
                if (activeRes.length === 0) {
                    this.sessionId = crypto.randomUUID();
                    await query`INSERT INTO telemetry_sessions (id, league_id, track_id, track_length, session_type, is_active, track_flags, pit_entry, pit_exit) 
                                VALUES (${this.sessionId}, ${resolvedLeagueId}, ${this.safeInt(trackId)}, ${this.safeInt(trackLength)}, ${sessionType}, true, ${this.safeInt(trackFlags)}, ${trackMetadata?.pitEntry || null}, ${trackMetadata?.pitExit || null})`;
                    this.log(`Session gestartet: ${this.sessionId}`);
                } else {
                    this.sessionId = activeRes[0].id;
                    // Update session_type if changed
                    await query`UPDATE telemetry_sessions SET session_type = ${sessionType} WHERE id = ${this.sessionId} AND session_type != ${sessionType}`;
                }
            }

            // 2. Batch-Positionen (NUR MENSCHEN)
            const humanIndices = new Set<number>();
            if (participants) participants.forEach((p: any) => { if (p.isHuman) humanIndices.add(p.carIndex); });

            if (packet.lapPositions?.length && humanIndices.size > 0) {
                const hp = packet.lapPositions.filter((lp: any) => humanIndices.has(lp.carIndex) && lp.position > 0);
                if (hp.length > 0) {
                    const placeholders: string[] = [];
                    const vals: any[] = [];
                    hp.forEach((lp: any, j: number) => {
                        const b = j * 5;
                        placeholders.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`);
                        vals.push(crypto.randomUUID(), this.sessionId, lp.carIndex, this.safeInt(lp.lapNumber), this.safeInt(lp.position));
                    });
                    await sql.query(`INSERT INTO telemetry_position_history (id, session_id, car_index, lap_number, position) VALUES ${placeholders.join(',')}`, vals);
                }
            }

            // 3. Batch-Teilnehmer-Update (Alle 22 in EINEM Rutsch!)
            if (participants && Array.isArray(participants)) {
                // Erst Driver-IDs cachen, die wir noch nicht kennen
                for (const p of participants) {
                    if (!this.driverCache.has(p.gameName)) {
                        const dRes = await query`SELECT id FROM drivers WHERE league_id = ${resolvedLeagueId} AND game_name = ${p.gameName} LIMIT 1`;
                        if (dRes.length > 0) this.driverCache.set(p.gameName, dRes[0].id);
                    }
                }

                // Batch-Upsert vorbereiten
                const pVals: any[] = [];
                const pPlaceholders: string[] = [];
                participants.forEach((p, idx) => {
                    const b = idx * 25;
                    const s = p.status || {};
                    pPlaceholders.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13},$${b+14},$${b+15},$${b+16},$${b+17},$${b+18},$${b+19},$${b+20},$${b+21},$${b+22},$${b+23},$${b+24},$${b+25})`);
                    pVals.push(
                        this.sessionId, p.gameName, this.driverCache.get(p.gameName) || null, this.safeInt(p.teamId), this.safeInt(p.carIndex),
                        this.safeInt(p.startPosition), this.safeInt(p.position), p.lapDistance || 0, this.safeInt(p.topSpeedKmh), p.isHuman || false,
                        this.safeInt(p.pitStops), this.safeInt(p.warnings), this.safeInt(p.penaltiesTime), s.visualTyreCompound || null, s.actualTyreCompound || null,
                        this.safeInt(s.tyresAgeLaps), this.safeInt(s.enginePowerICE), this.safeInt(s.enginePowerMGUK), this.safeInt(p.totalRaceTime, null as any), this.safeInt(p.penaltiesCount),
                        this.safeInt(s.steeringAssist, null as any), this.safeInt(s.brakingAssist, null as any), this.safeInt(s.gearboxAssist, null as any), this.safeInt(s.tractionControl, null as any), this.safeInt(s.anti_lock_brakes, null as any)
                    );
                });

                await sql.query(`
                    INSERT INTO telemetry_participants (
                        session_id, game_name, driver_id, team_id, car_index, start_position, position, 
                        lap_distance, top_speed, is_human, pit_stops, warnings, penalties_time, 
                        visual_tyre_compound, actual_tyre_compound, tyre_age_laps, engine_power_ice, 
                        engine_power_mguk, total_race_time, penalties_count, steering_assist, 
                        braking_assist, gearbox_assist, traction_control, anti_lock_brakes
                    ) VALUES ${pPlaceholders.join(',')}
                    ON CONFLICT(session_id, game_name) DO UPDATE SET
                        position = EXCLUDED.position, car_index = EXCLUDED.car_index, lap_distance = EXCLUDED.lap_distance,
                        top_speed = CASE WHEN EXCLUDED.top_speed > telemetry_participants.top_speed THEN EXCLUDED.top_speed ELSE telemetry_participants.top_speed END,
                        pit_stops = EXCLUDED.pit_stops, warnings = EXCLUDED.warnings, total_race_time = EXCLUDED.total_race_time
                    RETURNING id`, pVals);

                // Laps im RAM sammeln (Nur für Menschen)
                for (const p of participants) {
                    if (p.isHuman && p.laps) {
                        if (!this.humanLapsAccumulator.has(p.carIndex)) this.humanLapsAccumulator.set(p.carIndex, []);
                        const acc = this.humanLapsAccumulator.get(p.carIndex)!;
                        p.laps.forEach((lap: any) => {
                            const existing = acc.find((al: any) => al.lapNumber === lap.lapNumber);
                            if (!existing) acc.push({...lap});
                            else Object.assign(existing, lap);
                        });
                    }
                }
            }

            if (isSessionEnded) {
                this.log("FINISH: Speichere Top-2 Runden...");
                // (Cleanup und Finaler Export wie bisher, aber ultraschnell am Ende)
                for (const [carIdx, laps] of this.humanLapsAccumulator.entries()) {
                    const top2 = laps.filter(l => l.isValid && l.lapTimeMs > 10000).sort((a, b) => a.lapTimeMs - b.lapTimeMs).slice(0, 2);
                    // Teilnehmer-ID für die Relation holen (einmalig pro Auto am Ende)
                    const pRow = await query`SELECT id FROM telemetry_participants WHERE session_id = ${this.sessionId} AND car_index = ${carIdx} LIMIT 1`;
                    if (pRow.length > 0) {
                        for (const lap of top2) {
                            const lRes = await query`INSERT INTO telemetry_laps (participant_id, lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms, car_damage_json)
                                VALUES (${pRow[0].id}, ${this.safeInt(lap.lapNumber)}, ${this.safeInt(lap.lapTimeMs)}, ${lap.isValid}, ${lap.tyreCompound || null}, ${lap.isPitLap}, ${this.safeInt(lap.sector1Ms)}, ${this.safeInt(lap.sector2Ms)}, ${this.safeInt(lap.sector3Ms)}, ${JSON.stringify(lap.carDamage || {})}) RETURNING id`;
                            if (lRes.length > 0 && lap.samples) await query`INSERT INTO telemetry_lap_samples (lap_id, samples_json) VALUES (${lRes[0].id}, ${JSON.stringify(lap.samples)})`;
                        }
                    }
                }
                await query`UPDATE telemetry_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ${this.sessionId}`;
                this.sessionId = null;
                this.humanLapsAccumulator.clear();
                this.log("Session erfolgreich abgeschlossen.");
            }
        } catch (e: any) {
            this.log(`CRITICAL: ${e.message}`, 'error');
            throw e;
        }
    }

    private async resolveLeagueId(): Promise<string | null> {
        if (this.leagueCache.has(this.leagueId)) return this.leagueCache.get(this.leagueId)!;
        const res = await query`SELECT id FROM leagues WHERE id = ${this.leagueId} OR name ILIKE ${this.leagueId} LIMIT 1`;
        if (res.length > 0) {
            this.leagueCache.set(this.leagueId, res[0].id);
            return res[0].id;
        }
        return null;
    }
}
