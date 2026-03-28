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
import RacePaceChart from '@/components/analysis/RacePaceChart';
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
                        <span className="text-mono" style={{ color: 'var(--f1-red)', fontWeight: 600 }}>{formatLapTime(p.value)}</span>
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
            const sid = res.telemetrySessionId || null;
            setTelemetrySessionId(sid);

            // Alle-Fahrer-Graph laden
            setLoadingGraph(true);
            const [graphRes, scRes, analysisRes, lapsRes] = await Promise.all([
                sid ? getAllDriversRaceTelemetry(sid) : Promise.resolve({ success: false, laps: [], drivers: [] }),
                sid ? getSessionSafetyCarEvents(sid) : Promise.resolve({ success: false, events: [] }),
                sid ? getRaceAnalysis(sid) : Promise.resolve({ success: false, error: 'No session' }),
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

    // Liga-Back-URL bestimmen
    const leagueUrl = race?.league_id 
        ? `/dashboard?league=${race.league_id}` 
        : '/dashboard';
    const backLabel = race?.league_name || leagueName || 'Dashboard';

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="text-f1-bold animate-pulse" style={{ fontSize: '1.5rem', opacity: 0.5 }}>SYNCHRONIZING TELEMETRY...</div>
            </div>
        );
    }

    if (!race) {
        return (
            <div className="container section-padding flex flex-col items-center justify-center gap-medium" style={{ minHeight: '60vh' }}>
                <h1 className="h1" style={{ color: 'var(--f1-red)' }}>SESSION NOT FOUND</h1>
                <Link href="/dashboard" className="btn btn-secondary">↩ Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="animate-slide-up">
            {/* ── HEADER ── */}
            <div className="glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
                <div className="container" style={{ padding: '2rem 1.5rem' }}>
                    <div className="flex items-center gap-small mb-medium">
                        <Link href={leagueUrl} className="stat-label hover-f1" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
                            {backLabel}
                        </Link>
                        <span style={{ color: 'var(--glass-border)', fontSize: '0.8rem' }}>/</span>
                        <span className="text-f1-bold" style={{ color: 'var(--text-primary)', fontSize: '0.7rem' }}>GRAND PRIX ANALYSIS</span>
                    </div>
                    
                    <div className="flex justify-between items-end flex-wrap gap-medium">
                        <div>
                            <h1 className="h1 text-gradient" style={{ fontSize: '4rem', marginBottom: '0.25rem' }}>
                                {race.track}
                            </h1>
                            <div className="text-f1-bold" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', letterSpacing: '3px' }}>
                                {race.race_date
                                    ? new Date(race.race_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : race.created_at
                                    ? new Date(race.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : 'DATA N/A'}
                                {race.league_name && <span style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)' }}>// {race.league_name}</span>}
                            </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', textAlign: 'right' }}>
                            <div className="h2" style={{ fontSize: '2rem', marginBottom: 0 }}>{results.length}</div>
                            <div className="stat-label">DRIVER ENTRIES</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container section-padding flex flex-col gap-large">
                {/* ── RESULTS ── */}
                <section>
                    <h2 className="text-f1-bold mb-medium" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>SESSION RESULTS</h2>
                    <div className="f1-card" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table className="f1-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>Pos</th>
                                        <th>Driver</th>
                                        <th className="hide-mobile" style={{ textAlign: 'center' }}>Grid</th>
                                        <th className="hide-mobile" style={{ textAlign: 'center' }}>Pits</th>
                                        <th style={{ textAlign: 'right' }}>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((res, idx) => (
                                        <tr
                                            key={idx}
                                            onClick={() => res.driver_id && handleDriverClick(res)}
                                            style={{ cursor: res.driver_id ? 'pointer' : 'default' }}
                                        >
                                            <td className="pos-number text-mono">P{res.position}</td>
                                            <td>
                                                <div className="flex items-center gap-small">
                                                    <div style={{ width: '3px', height: '18px', borderRadius: '1px', background: res.driver_color || 'var(--text-muted)' }} />
                                                    <span className="text-f1-bold" style={{ fontSize: '1rem' }}>{res.driver_name}</span>
                                                    <div className="flex gap-small">
                                                        {res.is_dnf && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', fontWeight: 900 }}>DNF</span>}
                                                        {res.fastest_lap && !res.is_dnf && <span style={{ background: '#9c27b0', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', fontWeight: 900 }}>FL</span>}
                                                        {res.is_dropped && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '2px', fontWeight: 900 }}>DROPPED</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                            </td>
                                            <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                {res.pit_stops > 0 ? res.pit_stops : '-'}
                                            </td>
                                            <td className="text-right text-mono">
                                                <span className="text-f1-bold" style={{ fontSize: '1.2rem', color: res.is_dropped ? 'var(--text-muted)' : 'var(--f1-red)', textDecoration: res.is_dropped ? 'line-through' : 'none' }}>
                                                    {res.points_earned}
                                                </span>
                                                <span className="stat-label" style={{ marginLeft: '4px' }}>PTS</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ── CHARTS ── */}
                {sessionLaps.length > 0 && (
                    <section className="flex flex-col gap-large">
                        <div className="f1-card">
                            <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>PACE COMPARISON</h3>
                            <div style={{ height: '400px' }}>
                                <RacePaceChart laps={sessionLaps} />
                            </div>
                        </div>

                        {analysisData && (
                            <div className="flex flex-col gap-large">
                                <div className="f1-card">
                                    <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>GAP TO LEADER</h3>
                                    <div style={{ height: '400px' }}>
                                        <GapToLeaderChart laps={sessionLaps} />
                                    </div>
                                </div>

                                <div className="f1-card">
                                    <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>POSITION EVOLUTION</h3>
                                    <div style={{ height: '400px' }}>
                                        <LapPositionChart 
                                            participants={analysisData.participants}
                                            history={analysisData.positionHistory}
                                            totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50}
                                        />
                                    </div>
                                </div>

                                <div className="f1-card">
                                    <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>TYRE STRATEGY</h3>
                                    <div style={{ height: '400px' }}>
                                        <TyreStrategyChart 
                                            participants={analysisData.participants} 
                                            totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

// Suspense Wrapper wegen useSearchParams
export default function RaceDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="text-f1-bold animate-pulse" style={{ fontSize: '1.5rem', opacity: 0.5 }}>SYNCHRONIZING TELEMETRY...</div>
            </div>
        }>
            <RaceDetailContent />
        </Suspense>
    );
}
