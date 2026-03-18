'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRaceDetails,
    getDriverRaceTelemetry,
    getDriverPositionHistory,
    getSessionSafetyCarEvents
} from '@/lib/actions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function formatLapTime(ms: number): string {
    if (!ms || ms <= 0) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    return `${seconds}.${String(millis).padStart(3, '0')}`;
}

function getTyreInfo(compoundId: number): { letter: string; color: string; textColor: string; name: string } {
    // F1 25 compound IDs: 16=Soft, 17=Medium, 18=Hard, 7=Inter, 8=Wet
    switch (compoundId) {
        case 16: return { letter: 'S', color: '#e8002d', textColor: 'white', name: 'Soft' };
        case 17: return { letter: 'M', color: '#ffd700', textColor: 'black', name: 'Medium' };
        case 18: return { letter: 'H', color: '#f0f0f0', textColor: 'black', name: 'Hard' };
        case 7:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 8:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        // Ältere IDs
        case 0:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 1:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        default: return { letter: '?', color: '#555', textColor: 'white', name: `ID ${compoundId}` };
    }
}

function TyreBadge({ compoundId, lap }: { compoundId: number, lap?: number }) {
    const info = getTyreInfo(compoundId);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '22px', height: '22px', borderRadius: '50%',
            background: info.color, color: info.textColor,
            fontWeight: 900, fontSize: '0.65rem',
            border: '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0
        }} title={`${info.name}${lap ? ` (Runde ${lap})` : ''}`}>
            {info.letter}
        </span>
    );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────────

export default function RaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const raceId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [race, setRace] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);

    // Fahrer-Detail-Modal
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
    const [driverLaps, setDriverLaps] = useState<any[]>([]);
    const [positionHistory, setPositionHistory] = useState<any[]>([]);
    const [safetyCarEvents, setSafetyCarEvents] = useState<any[]>([]);
    const [fetchingDriver, setFetchingDriver] = useState(false);

    useEffect(() => {
        loadRace();
    }, [raceId]);

    async function loadRace() {
        setLoading(true);
        const res = await getRaceDetails(raceId);
        if (res.success) {
            setRace(res.race);
            setResults(res.results || []);
        }
        setLoading(false);
    }

    async function handleDriverClick(driverRes: any) {
        if (!driverRes.driver_id) return;
        setSelectedDriver(driverRes);
        setDriverLaps([]);
        setPositionHistory([]);
        setSafetyCarEvents([]);
        setFetchingDriver(true);

        const [telRes, posRes] = await Promise.all([
            getDriverRaceTelemetry(raceId, driverRes.driver_id),
            getDriverPositionHistory(raceId, driverRes.driver_id),
        ]);

        if (telRes.success) setDriverLaps(telRes.laps || []);

        if (posRes.success && (posRes.positions?.length ?? 0) > 0) {
            setPositionHistory(posRes.positions || []);
            if (posRes.sessionId) {
                const scRes = await getSessionSafetyCarEvents(posRes.sessionId);
                if (scRes.success) setSafetyCarEvents(scRes.events || []);
            }
        }
        setFetchingDriver(false);
    }

    // Positionsverlauf für den ausgewählten Fahrer ermitteln
    const driverPosData = (() => {
        if (!selectedDriver || positionHistory.length === 0) return [];
        const uniqueCarIndices = [...new Set(positionHistory.map((p: any) => p.car_index))];
        const carIdx = uniqueCarIndices.find(ci => {
            const lastLap = Math.max(...positionHistory.filter((p: any) => p.car_index === ci).map((p: any) => p.lap_number));
            return positionHistory.find((p: any) => p.car_index === ci && p.lap_number === lastLap)?.position === selectedDriver.position;
        });
        if (carIdx === undefined) return [];
        return positionHistory
            .filter((p: any) => p.car_index === carIdx)
            .map((p: any) => ({ lap: p.lap_number, position: p.position }));
    })();

    const scDeployEvents = safetyCarEvents.filter((e: any) => e.event_type === 0);

    // Schadensauswertung der letzten Runde
    const lastDamage = (() => {
        const withDmg = driverLaps.filter((l: any) => l.car_damage_json);
        if (withDmg.length === 0) return null;
        return JSON.parse(withDmg[withDmg.length - 1].car_damage_json);
    })();

    // Schnellste Runde
    const fastestLapMs = driverLaps.length > 0
        ? Math.min(...driverLaps.filter((l: any) => l.is_valid && l.lap_time_ms > 0).map((l: any) => l.lap_time_ms))
        : Infinity;

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-f1 animate-pulse" style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>LADE RENNDATEN...</div>
            </div>
        );
    }

    if (!race) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <div className="text-f1" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>RENNEN NICHT GEFUNDEN</div>
                <Link href="/dashboard" className="btn-secondary">↩ Zurück zum Dashboard</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '0 0 4rem 0' }}>
            {/* ── HEADER ── */}
            <div style={{ background: 'linear-gradient(180deg, rgba(225,6,0,0.15) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem clamp(1rem, 4vw, 3rem) 1rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Link href="/dashboard" style={{ fontSize: '0.7rem', color: 'var(--silver)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1rem', letterSpacing: '1px' }}>
                        ← ZURÜCK ZUM DASHBOARD
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="text-f1 text-gradient" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-2px', marginBottom: '0.25rem' }}>
                                {race.track}
                            </h1>
                            <div style={{ fontSize: '0.75rem', color: 'var(--silver)', letterSpacing: '2px' }}>
                                {race.race_date ? new Date(race.race_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Datum unbekannt'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--silver)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-f1)' }}>{results.length}</div>
                                <div style={{ letterSpacing: '1px' }}>FAHRER</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem clamp(0.75rem, 4vw, 2rem)' }}>

                {/* ── ERGEBNISTABELLE ── */}
                <div className="f1-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', width: '50px' }}>Pos</th>
                                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Fahrer</th>
                                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center', display: 'none' }} className="show-tablet">Grid</th>
                                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center', display: 'none' }} className="show-tablet">Pits</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '1px' }}>Punkte</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((res, idx) => (
                                <tr
                                    key={idx}
                                    className="hover-row"
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: res.driver_id ? 'pointer' : 'default',
                                        transition: 'background 0.15s',
                                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                                    }}
                                    onClick={() => res.driver_id && handleDriverClick(res)}
                                >
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <span style={{
                                            fontWeight: 900, fontStyle: 'italic',
                                            fontSize: idx === 0 ? '1.4rem' : idx < 3 ? '1.1rem' : '0.95rem',
                                            color: idx === 0 ? 'var(--f1-red)' : idx < 3 ? 'var(--white)' : 'var(--silver)',
                                            opacity: idx >= 3 ? 0.6 : 1
                                        }}>
                                            P{res.position}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <div style={{ width: '3px', height: '22px', borderRadius: '2px', background: res.driver_color || 'var(--silver)', flexShrink: 0 }} />
                                            <span className="text-f1" style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{res.driver_name}</span>
                                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                {res.is_dnf && <span style={{ background: 'rgba(225,6,0,0.15)', color: 'var(--f1-red)', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>DNF</span>}
                                                {res.fastest_lap && !res.is_dnf && <span style={{ background: '#9c27b0', color: 'white', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>FL</span>}
                                                {res.clean_driver && !res.is_dnf && <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>CD</span>}
                                                {res.is_dropped && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>DROPPED</span>}
                                                {res.penalties_time > 0 && <span style={{ color: 'var(--f1-red)', fontSize: '0.65rem', fontWeight: 700 }}>+{res.penalties_time}s</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem', display: 'none' }} className="show-tablet">
                                        {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem', display: 'none' }} className="show-tablet">
                                        {res.pit_stops > 0 ? res.pit_stops : '-'}
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: res.is_dropped ? 'rgba(225,6,0,0.4)' : 'var(--f1-red)', textDecoration: res.is_dropped ? 'line-through' : 'none' }}>
                                            {res.points_earned}
                                        </span>
                                        <span style={{ fontSize: '0.6rem', color: 'var(--silver)', marginLeft: '3px' }}>PTS</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── FAHRER-DETAIL-PANEL ── */}
                {selectedDriver && (
                    <div className="f1-card animate-fade-in" style={{ marginBottom: '2rem' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: selectedDriver.driver_color || 'var(--f1-red)' }} />
                                <div>
                                    <h2 className="text-f1" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: '0.2rem' }}>{selectedDriver.driver_name}</h2>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--silver)', flexWrap: 'wrap' }}>
                                        <span>P{selectedDriver.position}</span>
                                        {selectedDriver.quali_position > 0 && <span>Grid: P{selectedDriver.quali_position}</span>}
                                        {selectedDriver.pit_stops > 0 && <span>{selectedDriver.pit_stops} Pits</span>}
                                        {selectedDriver.penalties_time > 0 && <span style={{ color: 'var(--f1-red)' }}>+{selectedDriver.penalties_time}s Strafe</span>}
                                        {selectedDriver.warnings > 0 && <span style={{ color: '#ff8700' }}>{selectedDriver.warnings} Verwarnungen</span>}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedDriver(null); setDriverLaps([]); setPositionHistory([]); setSafetyCarEvents([]); }}
                                className="btn-secondary"
                                style={{ fontSize: '0.7rem', padding: '6px 14px', flexShrink: 0 }}
                            >
                                SCHLIESSEN ✕
                            </button>
                        </div>

                        {fetchingDriver ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                                <div className="text-f1 animate-pulse" style={{ fontSize: '0.9rem', color: 'var(--silver)' }}>LADE TELEMETRIE...</div>
                            </div>
                        ) : driverLaps.length > 0 ? (
                            <>
                                {/* Rundenzeit-Chart */}
                                <div style={{ marginBottom: '0.5rem', fontSize: '0.65rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }}>Rundenzeitverlauf</div>
                                <div style={{ width: '100%', height: 'clamp(180px, 30vw, 260px)', marginBottom: '2rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={driverLaps} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                            <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} />
                                            <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={formatLapTime} width={62} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                                labelFormatter={(l) => `Runde ${l}`}
                                                formatter={(v: any, _: any, props: any) => {
                                                    const lap = driverLaps[props.index];
                                                    return [
                                                        <span>{formatLapTime(v)} {lap && !lap.is_valid ? ' (INV)' : ''}</span>,
                                                        'Zeit'
                                                    ];
                                                }}
                                            />
                                            {scDeployEvents.map((e: any, i: number) => (
                                                <ReferenceLine key={i} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5}
                                                    label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'top', fill: '#ffc107', fontSize: 9 }} />
                                            ))}
                                            <Line
                                                type="monotone" dataKey="lap_time_ms" stroke="var(--f1-red)" strokeWidth={2}
                                                dot={(props: any) => {
                                                    const lap = driverLaps[props.index];
                                                    if (!lap) return <g key={props.key} />;
                                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3}
                                                        fill={!lap.is_valid ? 'rgba(225,6,0,0.3)' : 'var(--f1-red)'} />;
                                                }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Positionsverlauf */}
                                {driverPosData.length > 0 && (
                                    <>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.65rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }}>Positionsverlauf</div>
                                        <div style={{ width: '100%', height: 'clamp(140px, 22vw, 200px)', marginBottom: '2rem' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={driverPosData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                                    <XAxis dataKey="lap" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} />
                                                    <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} reversed domain={[1, Math.max(...driverPosData.map(d => d.position)) + 1]} tickFormatter={(v) => `P${v}`} width={30} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.8rem' }}
                                                        labelFormatter={(l) => `Runde ${l}`}
                                                        formatter={(v: any) => [`P${v}`, 'Position']}
                                                    />
                                                    {scDeployEvents.map((e: any, i: number) => (
                                                        <ReferenceLine key={i} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5} />
                                                    ))}
                                                    <Line type="monotone" dataKey="position" stroke="#00d2ff" strokeWidth={2} dot={{ r: 3, fill: '#00d2ff' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                )}

                                {/* Schadens-Anzeige */}
                                {lastDamage && Object.values(lastDamage).some((v: any) => v > 0) && (
                                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(225,6,0,0.07)', borderRadius: '8px', border: '1px solid rgba(225,6,0,0.2)' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--f1-red)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>⚠ Fahrzeugschäden (Endstand)</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {[
                                                { label: 'FL Flügel', val: lastDamage.frontLeftWingDamage },
                                                { label: 'FR Flügel', val: lastDamage.frontRightWingDamage },
                                                { label: 'Heckflügel', val: lastDamage.rearWingDamage },
                                                { label: 'Unterboden', val: lastDamage.floorDamage },
                                                { label: 'Diffusor', val: lastDamage.diffuserDamage },
                                                { label: 'Sidepod', val: lastDamage.sidepodDamage },
                                                { label: 'Getriebe', val: lastDamage.gearBoxDamage },
                                                { label: 'Motor', val: lastDamage.engineDamage },
                                                { label: 'Motor ausgefallen', val: lastDamage.engineBlown ? 100 : 0 },
                                            ].filter(d => d.val && d.val > 0).map(d => (
                                                <div key={d.label} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', background: d.val > 30 ? 'rgba(225,6,0,0.25)' : 'rgba(255,255,255,0.07)', color: d.val > 30 ? 'var(--f1-red)' : 'var(--silver)', fontWeight: 600 }}>
                                                    {d.label}: {d.val}%
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rundenzeittabelle */}
                                <div style={{ marginBottom: '0.5rem', fontSize: '0.65rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }}>Rundenzeiten</div>
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '480px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--silver)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Rd</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Zeit</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>S1</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>S2</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>S3</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Reifen</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Info</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {driverLaps.map((lap: any) => {
                                                const isFastest = lap.is_valid && lap.lap_time_ms === fastestLapMs;
                                                const hasDmg = lap.car_damage_json && JSON.parse(lap.car_damage_json).engineBlown;
                                                return (
                                                    <tr key={lap.lap_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: hasDmg ? 'rgba(225,6,0,0.04)' : 'transparent' }}>
                                                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--silver)', fontSize: '0.78rem' }}>{lap.lap_number}</td>
                                                        <td style={{ padding: '0.55rem 0.5rem', fontWeight: isFastest ? 900 : 400, fontSize: '0.82rem', color: isFastest ? '#9c27b0' : lap.is_valid ? 'var(--white)' : 'rgba(225,6,0,0.5)', fontFamily: 'monospace' }}>
                                                            {formatLapTime(lap.lap_time_ms)}
                                                            {isFastest && <span style={{ fontSize: '0.5rem', marginLeft: '4px', background: '#9c27b0', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>FL</span>}
                                                            {!lap.is_valid && <span style={{ fontSize: '0.5rem', marginLeft: '4px', color: 'var(--f1-red)' }}>INV</span>}
                                                        </td>
                                                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--silver)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{lap.sector1_ms ? formatLapTime(lap.sector1_ms) : '-'}</td>
                                                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--silver)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{lap.sector2_ms ? formatLapTime(lap.sector2_ms) : '-'}</td>
                                                        <td style={{ padding: '0.55rem 0.5rem', color: 'var(--silver)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{lap.sector3_ms ? formatLapTime(lap.sector3_ms) : '-'}</td>
                                                        <td style={{ padding: '0.55rem 0.5rem' }}>
                                                            {lap.tyre_compound ? <TyreBadge compoundId={lap.tyre_compound} /> : <span style={{ color: 'var(--silver)', fontSize: '0.7rem' }}>-</span>}
                                                        </td>
                                                        <td style={{ padding: '0.55rem 0.5rem' }}>
                                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                                {lap.is_pit_lap && <span style={{ background: '#ff8700', color: 'white', fontSize: '0.55rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>PIT</span>}
                                                                {hasDmg && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.55rem', padding: '1px 4px', borderRadius: '3px', fontWeight: 900 }}>AUSFALL</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.85rem' }}>
                                Keine Telemetrie-Daten für diesen Fahrer vorhanden.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CSS ── */}
            <style jsx global>{`
                .hover-row:hover { background: rgba(255,255,255,0.06) !important; }
                .show-tablet { display: none !important; }
                @media (min-width: 600px) {
                    .show-tablet { display: table-cell !important; }
                }
            `}</style>
        </div>
    );
}
