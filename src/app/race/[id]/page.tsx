'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getRaceDetails,
    getSessionSafetyCarEvents,
    getAllDriversRaceTelemetry,
    getRaceAnalysis,
    getSessionLaps,
} from '@/lib/actions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TyreStrategyChart } from '@/components/race/TyreStrategyChart';
import { LapPositionChart } from '@/components/race/LapPositionChart';
import GapToLeaderChart from '@/components/analysis/GapToLeaderChart';
import { useRouter } from 'next/navigation';

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
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [sessionLaps, setSessionLaps] = useState<any[]>([]);

    const router = useRouter();

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
            const [graphRes, scRes, analysisRes, lapsRes] = await Promise.all([
                getAllDriversRaceTelemetry(raceId),
                sid ? getSessionSafetyCarEvents(sid) : Promise.resolve({ success: false, events: [] }),
                getRaceAnalysis(raceId),
                sid ? getSessionLaps(sid) : Promise.resolve({ success: false, laps: [] })
            ]);
            if (graphRes.success) {
                setGraphData(graphRes.laps || []);
                setGraphDrivers(graphRes.drivers || []);
            }
            if (scRes.success && (scRes as any).events) {
                setScEvents((scRes as any).events.filter((e: any) => e.event_type === 0));
            }
            if (analysisRes.success) {
                setAnalysisData(analysisRes);
            }
            if (lapsRes.success) {
                setSessionLaps(lapsRes.laps || []);
            }
            setLoadingGraph(false);
        }
        setLoading(false);
    }

    function handleDriverClick(driverRes: any) {
        if (!driverRes.driver_id) return;
        router.push(`/race/${raceId}/driver/${driverRes.driver_id}?league=${encodeURIComponent(leagueName || '')}`);
    }

    // Liga-Back-URL bestimmen: falls league param, zurück zur Liga; sonst einfach Dashboard
    const leagueUrl = leagueName
        ? `/dashboard?league=${encodeURIComponent(leagueName)}`
        : (race?.league_name ? `/dashboard?league=${encodeURIComponent(race.league_name)}` : '/dashboard');
    const backLabel = race?.league_name || leagueName || 'Dashboard';

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
                                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
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
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls={false}
                                                opacity={1}
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
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--silver)', cursor: 'pointer' }}
                                        onClick={() => handleDriverClick(results.find((r: any) => r.driver_id === d.id) || { driver_id: d.id, driver_name: d.name, driver_color: d.color })}>
                                        <div style={{ width: '20px', height: '2px', background: d.color || 'var(--silver)', borderRadius: '1px' }} />
                                        {d.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── SESSION ANALYSIS (PHASE 4) ── */}
                {analysisData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '0 0.5rem' }}>
                            <div className="text-f1" style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px', letterSpacing: '1px' }}>SESSION ANALYSIS</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Detailed telemetry breakdown including gap to leader and tyre strategy.</div>
                        </div>

                        {sessionLaps.length > 0 && (
                            <GapToLeaderChart laps={sessionLaps} />
                        )}

                        <LapPositionChart 
                            participants={analysisData.participants}
                            history={analysisData.positionHistory}
                            totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50}
                        />

                        <TyreStrategyChart 
                            participants={analysisData.participants} 
                            totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50} 
                        />
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
