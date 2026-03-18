'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getRaceDetails,
    getDriverRaceTelemetry,
    getDriverPositionHistory,
    getSessionSafetyCarEvents,
    getAllDriversRaceTelemetry,
} from '@/lib/actions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
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
    switch (compoundId) {
        case 16: return { letter: 'S', color: '#e8002d', textColor: 'white', name: 'Soft' };
        case 17: return { letter: 'M', color: '#ffd700', textColor: 'black', name: 'Medium' };
        case 18: return { letter: 'H', color: '#f0f0f0', textColor: 'black', name: 'Hard' };
        case 7:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 8:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        case 0:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 1:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        default: return { letter: '?', color: '#555', textColor: 'white', name: `ID ${compoundId}` };
    }
}

function TyreBadge({ compoundId }: { compoundId: number }) {
    const info = getTyreInfo(compoundId);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '20px', height: '20px', borderRadius: '50%',
            background: info.color, color: info.textColor,
            fontWeight: 900, fontSize: '0.6rem',
            border: '1.5px solid rgba(255,255,255,0.25)',
            flexShrink: 0, verticalAlign: 'middle'
        }} title={info.name}>
            {info.letter}
        </span>
    );
}

// Tooltip für den Alle-Fahrer-Graph: zeigt aktuelle Reifen pro Fahrer
function AllDriversTooltip({ active, payload, label, drivers, graphData }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const lapRow = graphData.find((d: any) => d.lap_number === label);
    return (
        <div style={{
            background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.75rem', minWidth: '160px'
        }}>
            <div style={{ color: 'var(--silver)', marginBottom: '0.5rem', fontWeight: 700 }}>Runde {label}</div>
            {payload.filter((p: any) => p.value).map((p: any) => {
                const d = drivers.find((dr: any) => dr.id === p.dataKey);
                if (!d) return null;
                const tyreCmpd = lapRow?.[`${d.id}_current_tyre`];
                return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: d.color || 'var(--silver)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--white)', flex: 1 }}>{d.name}</span>
                        {tyreCmpd ? <TyreBadge compoundId={tyreCmpd} /> : null}
                        <span style={{ color: 'var(--f1-red)', fontFamily: 'monospace', fontWeight: 600 }}>{formatLapTime(p.value)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Haupt-Komponente (inner) ───────────────────────────────────────────────────

function RaceDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const raceId = params.id as string;
    const leagueName = searchParams.get('league') || null;

    const [loading, setLoading] = useState(true);
    const [race, setRace] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [telemetrySessionId, setTelemetrySessionId] = useState<string | null>(null);

    // Alle-Fahrer-Graph
    const [graphData, setGraphData] = useState<any[]>([]);
    const [graphDrivers, setGraphDrivers] = useState<any[]>([]);
    const [scEvents, setScEvents] = useState<any[]>([]);
    const [loadingGraph, setLoadingGraph] = useState(false);

    // Fahrer-Detail-Panel
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
    const [driverLaps, setDriverLaps] = useState<any[]>([]);
    const [positionHistory, setPositionHistory] = useState<any[]>([]);
    const [fetchingDriver, setFetchingDriver] = useState(false);

    useEffect(() => { loadRace(); }, [raceId]);

    async function loadRace() {
        setLoading(true);
        const res = await getRaceDetails(raceId);
        if (res.success) {
            setRace(res.race);
            setResults(res.results || []);
            const sid = (res as any).telemetrySessionId || null;
            setTelemetrySessionId(sid);

            // Alle-Fahrer-Graph laden
            setLoadingGraph(true);
            const [graphRes, scRes] = await Promise.all([
                getAllDriversRaceTelemetry(raceId),
                sid ? getSessionSafetyCarEvents(sid) : Promise.resolve({ success: false, events: [] }),
            ]);
            if (graphRes.success) {
                setGraphData(graphRes.laps || []);
                setGraphDrivers(graphRes.drivers || []);
            }
            if (scRes.success && (scRes as any).events) {
                setScEvents((scRes as any).events.filter((e: any) => e.event_type === 0));
            }
            setLoadingGraph(false);
        }
        setLoading(false);
    }

    async function handleDriverClick(driverRes: any) {
        if (!driverRes.driver_id) return;
        if (selectedDriver?.driver_id === driverRes.driver_id) {
            setSelectedDriver(null); setDriverLaps([]); setPositionHistory([]);
            return;
        }
        setSelectedDriver(driverRes);
        setDriverLaps([]);
        setPositionHistory([]);
        setFetchingDriver(true);

        const [telRes, posRes] = await Promise.all([
            getDriverRaceTelemetry(raceId, driverRes.driver_id),
            getDriverPositionHistory(raceId, driverRes.driver_id),
        ]);
        if (telRes.success) setDriverLaps(telRes.laps || []);
        if (posRes.success && (posRes.positions?.length ?? 0) > 0) {
            setPositionHistory(posRes.positions || []);
        }
        setFetchingDriver(false);
    }

    // Liga-Back-URL bestimmen: falls league param, zurück zur Liga; sonst einfach Dashboard
    const leagueUrl = leagueName
        ? `/dashboard?league=${encodeURIComponent(leagueName)}`
        : (race?.league_name ? `/dashboard?league=${encodeURIComponent(race.league_name)}` : '/dashboard');
    const backLabel = race?.league_name || leagueName || 'Dashboard';

    // Positionsverlauf des ausgewählten Fahrers
    const driverPosData = (() => {
        if (!selectedDriver || positionHistory.length === 0) return [];
        const matching = positionHistory.filter((p: any) => {
            // Versuche den richtigen car_index zu finden
            return true;
        });
        // Nimm alle Positionen des Fahrers (sie sind schon gefiltert per server action)
        return positionHistory.map((p: any) => ({ lap: p.lap_number, position: p.position }));
    })();

    // Schnellste Runde des ausgewählten Fahrers
    const fastestLapMs = driverLaps.length > 0
        ? Math.min(...driverLaps.filter((l: any) => l.is_valid && l.lap_time_ms > 0).map((l: any) => l.lap_time_ms))
        : Infinity;

    // Letzter Schadensstatus
    const lastDamage = (() => {
        const withDmg = driverLaps.filter((l: any) => l.car_damage_json);
        if (withDmg.length === 0) return null;
        try { return JSON.parse(withDmg[withDmg.length - 1].car_damage_json); } catch { return null; }
    })();

    // Aktuellen Reifen des Fahrers (letzte Runde)
    const currentTyre = driverLaps.length > 0 ? driverLaps[driverLaps.length - 1]?.tyre_compound : null;

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
                <Link href="/dashboard" className="btn-secondary">↩ Zurück</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            {/* ── HEADER ── */}
            <div style={{ background: 'linear-gradient(180deg, rgba(225,6,0,0.18) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem clamp(1rem, 4vw, 3rem) 1rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Link href={leagueUrl} style={{ fontSize: '0.65rem', color: 'var(--silver)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        ← {backLabel}
                    </Link>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 className="text-f1 text-gradient" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-2px', marginBottom: '0.25rem' }}>
                                {race.track}
                            </h1>
                            <div style={{ fontSize: '0.7rem', color: 'var(--silver)', letterSpacing: '2px' }}>
                                {race.race_date
                                    ? new Date(race.race_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : race.created_at
                                    ? new Date(race.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : 'Datum unbekannt'}
                                {race.league_name && <span style={{ marginLeft: '1rem', opacity: 0.5 }}>{race.league_name}</span>}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--silver)', textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-f1)', lineHeight: 1 }}>{results.length}</div>
                            <div style={{ letterSpacing: '1px', marginTop: '2px' }}>FAHRER</div>
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
                                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center' }} className="show-tablet">Grid</th>
                                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--silver)', fontSize: '0.6rem', fontWeight: 900, textAlign: 'center' }} className="show-tablet">Pits</th>
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
                                        background: selectedDriver?.driver_id === res.driver_id
                                            ? 'rgba(225,6,0,0.08)' : idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                                    }}
                                    onClick={() => res.driver_id && handleDriverClick(res)}
                                >
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <span style={{
                                            fontWeight: 900, fontStyle: 'italic',
                                            fontSize: idx === 0 ? '1.4rem' : idx < 3 ? '1.1rem' : '0.95rem',
                                            color: idx === 0 ? 'var(--f1-red)' : idx < 3 ? 'var(--white)' : 'var(--silver)',
                                            opacity: idx >= 3 ? 0.7 : 1
                                        }}>P{res.position}</span>
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ width: '3px', height: '22px', borderRadius: '2px', background: res.driver_color || 'var(--silver)', flexShrink: 0 }} />
                                            <span className="text-f1" style={{ fontSize: '0.95rem' }}>{res.driver_name}</span>
                                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                {res.is_dnf && <span style={{ background: 'rgba(225,6,0,0.15)', color: 'var(--f1-red)', fontSize: '0.56rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>DNF</span>}
                                                {res.fastest_lap && !res.is_dnf && <span style={{ background: '#9c27b0', color: 'white', fontSize: '0.56rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>FL</span>}
                                                {res.clean_driver && !res.is_dnf && <span style={{ background: 'var(--success)', color: 'white', fontSize: '0.56rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>CD</span>}
                                                {res.is_dropped && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.56rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>DROPPED</span>}
                                                {res.penalties_time > 0 && <span style={{ color: 'var(--f1-red)', fontSize: '0.65rem', fontWeight: 700 }}>+{res.penalties_time}s</span>}
                                            </div>
                                            {res.driver_id && <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.5px' }}>DETAILS →</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem' }} className="show-tablet">
                                        {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                    </td>
                                    <td style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem' }} className="show-tablet">
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

                {/* ── ALLE-FAHRER-GRAPH ── */}
                {(graphData.length > 0 || loadingGraph) && (
                    <div className="f1-card" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Rundenzeitverlauf</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Alle Fahrer im Vergleich · Reifenfarbe ändert sich bei Pit · {scEvents.length > 0 ? `${scEvents.length} SC/VSC-Phase${scEvents.length > 1 ? 'n' : ''}` : 'keine SC-Phase'}</div>
                            </div>
                            {/* Legende Reifen */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[16, 17, 18, 7, 8].filter(id => {
                                    return graphData.some((d: any) => graphDrivers.some((dr: any) => d[`${dr.id}_current_tyre`] === id));
                                }).map(id => {
                                    const info = getTyreInfo(id);
                                    return (
                                        <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--silver)' }}>
                                            <TyreBadge compoundId={id} /> {info.name}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {loadingGraph ? (
                            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="animate-pulse" style={{ color: 'var(--silver)', fontSize: '0.85rem' }}>Lade Telemetrie...</div>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: 'clamp(200px, 35vw, 320px)' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={graphData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            {graphDrivers.map(driver => {
                                                const driverLapData = graphData.filter(d => d[driver.id] !== undefined);
                                                if (driverLapData.length === 0) return null;
                                                const minLap = Math.min(...driverLapData.map(d => d.lap_number));
                                                const maxLap = Math.max(...driverLapData.map(d => d.lap_number));
                                                const range = maxLap - minLap || 1;
                                                let stops: any[] = [];
                                                let currentTyreId = driverLapData[0]?.[`${driver.id}_current_tyre`];
                                                stops.push(<stop key="s0" offset="0%" stopColor={getTyreInfo(currentTyreId).color} />);
                                                driverLapData.forEach(lap => {
                                                    const t = lap[`${driver.id}_current_tyre`];
                                                    if (t !== currentTyreId && t !== undefined) {
                                                        const pct = `${((lap.lap_number - minLap) / range) * 100}%`;
                                                        stops.push(<stop key={`e${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(currentTyreId).color} />);
                                                        stops.push(<stop key={`s${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(t).color} />);
                                                        currentTyreId = t;
                                                    }
                                                });
                                                stops.push(<stop key="send" offset="100%" stopColor={getTyreInfo(currentTyreId).color} />);
                                                return (
                                                    <linearGradient key={`tg-${driver.id}`} id={`tyre-${driver.id}`} x1="0" y1="0" x2="1" y2="0">
                                                        {stops}
                                                    </linearGradient>
                                                );
                                            })}
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} label={{ value: 'Runde', position: 'insideBottomRight', fill: 'var(--silver)', fontSize: 9, offset: -4 }} />
                                        <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={formatLapTime} width={65} />
                                        <Tooltip content={<AllDriversTooltip drivers={graphDrivers} graphData={graphData} />} />
                                        {/* Safety Car Referenzlinien */}
                                        {scEvents.map((e: any, i: number) => (
                                            <ReferenceLine key={`sc-${i}`} x={e.lap_number} stroke="#ffc107"
                                                strokeDasharray="5 3" strokeWidth={1.5}
                                                label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'top', fill: '#ffc107', fontSize: 9 }}
                                            />
                                        ))}
                                        {/* Highlight-Linie für ausgewählten Fahrer */}
                                        {graphDrivers.map((driver) => (
                                            <Line
                                                key={driver.id}
                                                type="monotone"
                                                dataKey={driver.id}
                                                stroke={`url(#tyre-${driver.id})`}
                                                strokeWidth={selectedDriver?.driver_id === driver.id ? 4 : 2}
                                                dot={false}
                                                connectNulls={false}
                                                opacity={selectedDriver && selectedDriver.driver_id !== driver.id ? 0.25 : 1}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Graph-Legende Fahrer */}
                        {graphDrivers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                {graphDrivers.map(d => (
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: selectedDriver?.driver_id === d.id ? 'var(--white)' : 'var(--silver)', cursor: 'pointer' }}
                                        onClick={() => handleDriverClick(results.find((r: any) => r.driver_id === d.id) || { driver_id: d.id, driver_name: d.name, driver_color: d.color })}>
                                        <div style={{ width: '20px', height: '2px', background: d.color || 'var(--silver)', borderRadius: '1px' }} />
                                        {d.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── FAHRER-DETAIL-PANEL ── */}
                {selectedDriver && (
                    <div className="f1-card animate-fade-in" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: selectedDriver.driver_color || 'var(--f1-red)', flexShrink: 0 }} />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <h2 className="text-f1" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.6rem)', marginBottom: 0 }}>{selectedDriver.driver_name}</h2>
                                        {/* Aktueller Reifen (letzter bekannter) */}
                                        {currentTyre && <TyreBadge compoundId={currentTyre} />}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--silver)', flexWrap: 'wrap', marginTop: '3px' }}>
                                        <span>P{selectedDriver.position}</span>
                                        {selectedDriver.quali_position > 0 && <span>Grid: P{selectedDriver.quali_position}</span>}
                                        {selectedDriver.pit_stops > 0 && <span>{selectedDriver.pit_stops} Pit{selectedDriver.pit_stops > 1 ? 's' : ''}</span>}
                                        {selectedDriver.penalties_time > 0 && <span style={{ color: 'var(--f1-red)' }}>+{selectedDriver.penalties_time}s Strafe</span>}
                                        {selectedDriver.warnings > 0 && <span style={{ color: '#ff8700' }}>{selectedDriver.warnings} Verwarnungen</span>}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedDriver(null); setDriverLaps([]); setPositionHistory([]); }}
                                className="btn-secondary"
                                style={{ fontSize: '0.65rem', padding: '5px 12px', flexShrink: 0 }}
                            >✕</button>
                        </div>

                        {fetchingDriver ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div className="text-f1 animate-pulse" style={{ fontSize: '0.85rem', color: 'var(--silver)' }}>LADE TELEMETRIE...</div>
                            </div>
                        ) : driverLaps.length > 0 ? (
                            <>
                                {/* Rundenzeitverlauf */}
                                <div style={{ marginBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Rundenzeitverlauf</div>
                                <div style={{ width: '100%', height: 'clamp(160px, 28vw, 240px)', marginBottom: '1.5rem' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={driverLaps} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <defs>
                                                {/* Reifen-Farbverlauf auch für den Einzelfahrer-Chart */}
                                                {(() => {
                                                    if (driverLaps.length === 0) return null;
                                                    const minLap = Math.min(...driverLaps.map(d => d.lap_number));
                                                    const maxLap = Math.max(...driverLaps.map(d => d.lap_number));
                                                    const range = maxLap - minLap || 1;
                                                    let stops: any[] = [];
                                                    let curTyre = driverLaps[0]?.tyre_compound;
                                                    stops.push(<stop key="s0" offset="0%" stopColor={getTyreInfo(curTyre).color} />);
                                                    driverLaps.forEach(lap => {
                                                        if (lap.tyre_compound !== curTyre && lap.tyre_compound !== undefined) {
                                                            const pct = `${((lap.lap_number - minLap) / range) * 100}%`;
                                                            stops.push(<stop key={`e${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(curTyre).color} />);
                                                            stops.push(<stop key={`s${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(lap.tyre_compound).color} />);
                                                            curTyre = lap.tyre_compound;
                                                        }
                                                    });
                                                    stops.push(<stop key="send" offset="100%" stopColor={getTyreInfo(curTyre).color} />);
                                                    return (
                                                        <linearGradient id="singleTyre" x1="0" y1="0" x2="1" y2="0">
                                                            {stops}
                                                        </linearGradient>
                                                    );
                                                })()}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                            <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} />
                                            <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={formatLapTime} width={62} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.78rem' }}
                                                labelFormatter={(l) => `Runde ${l}`}
                                                formatter={(v: any, _key: any, props: any) => {
                                                    const lap = driverLaps.find((l: any) => l.lap_number === props.payload?.lap_number);
                                                    const tyrInfo = lap?.tyre_compound ? getTyreInfo(lap.tyre_compound) : null;
                                                    return [
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {formatLapTime(v)}
                                                            {!lap?.is_valid && <span style={{ color: 'var(--f1-red)', fontSize: '0.65em' }}>INV</span>}
                                                            {tyrInfo && <TyreBadge compoundId={lap.tyre_compound} />}
                                                        </span>,
                                                        'Zeit'
                                                    ];
                                                }}
                                            />
                                            {scEvents.map((e: any, i: number) => (
                                                <ReferenceLine key={i} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5}
                                                    label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'top', fill: '#ffc107', fontSize: 9 }} />
                                            ))}
                                            <Line type="monotone" dataKey="lap_time_ms" stroke="url(#singleTyre)" strokeWidth={2.5}
                                                dot={(props: any) => {
                                                    const lap = driverLaps[props.index];
                                                    if (!lap) return <g key={props.key} />;
                                                    // Zeige Reifen-Badge als Dot wenn Pit-Runde
                                                    if (lap.is_pit_lap && lap.tyre_compound) {
                                                        const info = getTyreInfo(lap.tyre_compound);
                                                        return (
                                                            <circle key={props.key} cx={props.cx} cy={props.cy} r={5}
                                                                fill={info.color} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                                                        );
                                                    }
                                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={2.5}
                                                        fill={!lap.is_valid ? 'rgba(225,6,0,0.3)' : 'var(--f1-red)'} />;
                                                }}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Schadens-Anzeige */}
                                {lastDamage && Object.values(lastDamage).some((v: any) => v > 0) && (
                                    <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(225,6,0,0.07)', borderRadius: '8px', border: '1px solid rgba(225,6,0,0.2)' }}>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--f1-red)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>⚠ Fahrzeugschäden (Endstand)</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                            {[
                                                { label: 'FL-Flügel', val: lastDamage.frontLeftWingDamage },
                                                { label: 'FR-Flügel', val: lastDamage.frontRightWingDamage },
                                                { label: 'Heckflügel', val: lastDamage.rearWingDamage },
                                                { label: 'Unterboden', val: lastDamage.floorDamage },
                                                { label: 'Diffusor', val: lastDamage.diffuserDamage },
                                                { label: 'Sidepod', val: lastDamage.sidepodDamage },
                                                { label: 'Getriebe', val: lastDamage.gearBoxDamage },
                                                { label: 'Motor', val: lastDamage.engineDamage },
                                                { label: 'Motor ausgefallen', val: lastDamage.engineBlown ? 100 : 0 },
                                            ].filter(d => d.val && d.val > 0).map(d => (
                                                <div key={d.label} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: d.val > 30 ? 'rgba(225,6,0,0.2)' : 'rgba(255,255,255,0.06)', color: d.val > 30 ? 'var(--f1-red)' : 'var(--silver)', fontWeight: 600 }}>
                                                    {d.label}: {d.val}%
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rundenzeittabelle */}
                                <div style={{ marginBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Rundenzeiten</div>
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '460px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--silver)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>Rd</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>Zeit</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>S1</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>S2</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>S3</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>Reifen</th>
                                                <th style={{ padding: '0.5rem 0.5rem' }}>Info</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {driverLaps.map((lap: any) => {
                                                const isFastest = lap.is_valid && lap.lap_time_ms === fastestLapMs;
                                                const hasDmg = lap.car_damage_json && (() => { try { return JSON.parse(lap.car_damage_json).engineBlown; } catch { return false; } })();
                                                return (
                                                    <tr key={lap.lap_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--silver)', fontSize: '0.76rem' }}>{lap.lap_number}</td>
                                                        <td style={{ padding: '0.5rem 0.5rem', fontWeight: isFastest ? 900 : 400, fontSize: '0.8rem', color: isFastest ? '#9c27b0' : lap.is_valid ? 'var(--white)' : 'rgba(225,6,0,0.4)', fontFamily: 'monospace' }}>
                                                            {formatLapTime(lap.lap_time_ms)}
                                                            {isFastest && <span style={{ fontSize: '0.48rem', marginLeft: '3px', background: '#9c27b0', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>FL</span>}
                                                            {!lap.is_valid && <span style={{ fontSize: '0.48rem', marginLeft: '3px', color: 'var(--f1-red)' }}>INV</span>}
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--silver)', fontSize: '0.73rem', fontFamily: 'monospace' }}>{lap.sector1_ms ? formatLapTime(lap.sector1_ms) : '-'}</td>
                                                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--silver)', fontSize: '0.73rem', fontFamily: 'monospace' }}>{lap.sector2_ms ? formatLapTime(lap.sector2_ms) : '-'}</td>
                                                        <td style={{ padding: '0.5rem 0.5rem', color: 'var(--silver)', fontSize: '0.73rem', fontFamily: 'monospace' }}>{lap.sector3_ms ? formatLapTime(lap.sector3_ms) : '-'}</td>
                                                        <td style={{ padding: '0.5rem 0.5rem' }}>
                                                            {lap.tyre_compound ? <TyreBadge compoundId={lap.tyre_compound} /> : <span style={{ color: 'var(--silver)', fontSize: '0.7rem' }}>-</span>}
                                                        </td>
                                                        <td style={{ padding: '0.5rem 0.5rem' }}>
                                                            <div style={{ display: 'flex', gap: '3px' }}>
                                                                {lap.is_pit_lap && <span style={{ background: '#ff8700', color: 'white', fontSize: '0.52rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>PIT</span>}
                                                                {hasDmg && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.52rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>AUSFALL</span>}
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
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.82rem' }}>
                                Keine Telemetrie-Daten für diesen Fahrer.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .hover-row:hover { background: rgba(255,255,255,0.05) !important; }
                .show-tablet { display: none !important; }
                @media (min-width: 600px) { .show-tablet { display: table-cell !important; } }
            `}</style>
        </div>
    );
}

// Suspense Wrapper wegen useSearchParams
export default function RaceDetailPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-f1 animate-pulse" style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>LADE...</div>
            </div>
        }>
            <RaceDetailContent />
        </Suspense>
    );
}
