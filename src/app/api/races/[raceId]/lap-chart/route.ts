import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { raceId: string } }) {
    const { raceId } = params;

    try {
        // 1. Telemetry session identifying
        const sessionRes = await query<any>(
            `SELECT id FROM telemetry_sessions WHERE race_id = ? LIMIT 1`,
            [raceId]
        );

        if (sessionRes.length === 0) {
            return NextResponse.json({ success: false, error: 'Keine Telemetrie für dieses Rennen gefunden' }, { status: 404 });
        }

        const sessionId = sessionRes[0].id;

        // 2. Alle Teilnehmer für diese Session
        const participants = await query<any>(
            `SELECT p.id, p.game_name, p.driver_id, d.name as driver_name, p.position, p.team_id
             FROM telemetry_participants p
             LEFT JOIN drivers d ON p.driver_id = d.id
             WHERE p.session_id = ?`,
            [sessionId]
        );

        const result: any[] = [];

        for (const p of participants) {
            // Runden-Daten
            const laps = await query<any>(
                `SELECT lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap, sector1_ms, sector2_ms, sector3_ms
                 FROM telemetry_laps
                 WHERE participant_id = ?
                 ORDER BY lap_number ASC`,
                [p.id]
            );

            // Stint-Daten
            const stints = await query<any>(
                `SELECT stint_number, tyre_compound, visual_compound, start_lap, end_lap, tyre_age_at_start
                 FROM telemetry_stints
                 WHERE participant_id = ?
                 ORDER BY stint_number ASC`,
                [p.id]
            );

            result.push({
                ...p,
                laps,
                stints
            });
        }

        // 3. Positionsverlauf
        const positionHistory = await query<any>(
            `SELECT car_index, lap_number, position FROM telemetry_position_history WHERE session_id = ? ORDER BY lap_number ASC`,
            [sessionId]
        );

        // 4. Incidents
        const incidents = await query<any>(
            `SELECT type, details, lap_num, timestamp FROM telemetry_incidents WHERE session_id = ? ORDER BY timestamp ASC`,
            [sessionId]
        );

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
