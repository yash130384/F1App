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
    getCarSetups,
    getSpeedTraps,
    getTrackMetadata,
    getPerformanceScores,
} from '@/lib/actions';
import { TyreStrategyChart } from '@/components/race/TyreStrategyChart';
import { LapPositionChart } from '@/components/race/LapPositionChart';
import GapToLeaderChart from '@/components/analysis/GapToLeaderChart';
import RacePaceChart from '@/components/analysis/RacePaceChart';
import CarSetupViewer from '@/components/analysis/CarSetupViewer';
import SpeedTrapOverview from '@/components/analysis/SpeedTrapOverview';
import PerformanceScorecard from '@/components/analysis/PerformanceScorecard';
import { useRouter } from 'next/navigation';

type TabType = 'OVERVIEW' | 'ANALYSIS' | 'SETUPS' | 'SPEEDTRAPS';

function RaceDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const raceId = params.id as string;
    const leagueName = searchParams.get('league') || null;

    const [loading, setLoading] = useState(true);
    const [race, setRace] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [telemetrySessionId, setTelemetrySessionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

    // Data states
    const [graphData, setGraphData] = useState<any[]>([]);
    const [scEvents, setScEvents] = useState<any[]>([]);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [sessionLaps, setSessionLaps] = useState<any[]>([]);
    const [carSetups, setCarSetups] = useState<any[]>([]);
    const [speedTraps, setSpeedTraps] = useState<any[]>([]);
    const [trackMeta, setTrackMeta] = useState<any[]>([]);
    const [performanceScores, setPerformanceScores] = useState<any>(null);

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

            if (sid) {
                const [graphRes, scRes, analysisRes, lapsRes, setupsRes, trapsRes, metaRes, perfRes] = await Promise.all([
                    getAllDriversRaceTelemetry(sid),
                    getSessionSafetyCarEvents(sid),
                    getRaceAnalysis(sid),
                    getSessionLaps(sid),
                    getCarSetups(sid),
                    getSpeedTraps(sid),
                    getTrackMetadata(res.race.track_id),
                    getPerformanceScores(sid)
                ]);

                if (graphRes.success) setGraphData(graphRes.laps || []);
                if (scRes.success && (scRes as any).events) setScEvents((scRes as any).events.filter((e: any) => e.event_type === 0));
                if (analysisRes.success) setAnalysisData(analysisRes);
                if (lapsRes.success) setSessionLaps(lapsRes.laps || []);
                if (setupsRes.success) setCarSetups(setupsRes.setups || []);
                if (trapsRes.success) setSpeedTraps(trapsRes.traps || []);
                if (metaRes.success) setTrackMeta(metaRes.metadata || []);
                if (perfRes.success) setPerformanceScores(perfRes.scores);
            }
        }
        setLoading(false);
    }

    function handleDriverClick(driverRes: any) {
        if (!driverRes.driver_id) return;
        router.push(`/race/${raceId}/driver/${driverRes.driver_id}?league=${encodeURIComponent(leagueName || '')}`);
    }

    const leagueUrl = race?.league_id ? `/dashboard?league=${race.league_id}` : '/dashboard';
    const backLabel = race?.league_name || leagueName || 'Dashboard';

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="text-f1-bold animate-pulse text-2xl opacity-50 tracking-widest uppercase italic">SYNCING QUANTUM TELEMETRY...</div>
            </div>
        );
    }

    const TabButton = ({ type, label }: { type: TabType, label: string }) => (
        <button 
            onClick={() => setActiveTab(type)}
            className={`px-8 py-4 text-xs font-black tracking-[0.3em] uppercase transition-all relative ${
                activeTab === type ? 'text-white' : 'text-silver/40 hover:text-silver'
            }`}
        >
            {label}
            {activeTab === type && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-f1-red shadow-[0_-4px_12px_rgba(232,0,45,0.6)]" />
            )}
        </button>
    );

    // Prepare driver list for components
    const driverList = results.map(r => ({
        id: r.participant_id || r.driver_id, // Ensure we have a valid mapping
        name: r.driver_name,
        color: r.driver_color || '#fff'
    }));

    return (
        <div className="animate-in fade-in duration-1000">
            {/* ── HEADER ── */}
            <div className="glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
                <div className="container" style={{ padding: '2rem 1.5rem' }}>
                    <div className="flex items-center gap-small mb-medium">
                        <Link href={leagueUrl} className="stat-label hover-f1" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
                            {backLabel}
                        </Link>
                        <span style={{ color: 'var(--glass-border)', fontSize: '0.8rem' }}>/</span>
                        <span className="text-f1-bold font-italic" style={{ color: 'var(--text-primary)', fontSize: '0.7rem' }}>PERFORMANCE ANALYTICS</span>
                    </div>
                    
                    <div className="flex justify-between items-end flex-wrap gap-medium">
                        <div>
                            <h1 className="h1 text-gradient italic font-black" style={{ fontSize: '4.5rem', marginBottom: '0.25rem', lineHeight: 1 }}>
                                {race.track}
                            </h1>
                            <div className="text-f1-bold" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', letterSpacing: '4px' }}>
                                {race.race_date ? new Date(race.race_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'SESSION RECORDED'}
                                <span className="mx-4 opacity-20">|</span>
                                <span className="text-white/40">{race.league_name}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TAB NAVIGATION ── */}
                <div className="container border-t border-white/5 flex flex-wrap">
                    <TabButton type="OVERVIEW" label="Übersicht" />
                    <TabButton type="ANALYSIS" label="Analyse" />
                    {carSetups.length > 0 && <TabButton type="SETUPS" label="Setups" />}
                    {speedTraps.length > 0 && <TabButton type="SPEEDTRAPS" label="Speed Traps" />}
                </div>
            </div>

            <div className="container section-padding pb-32">
                {activeTab === 'OVERVIEW' && (
                    <div className="flex flex-col gap-large animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Session Results Table */}
                        <section>
                            <h2 className="text-f1-bold text-xs mb-6 uppercase tracking-[0.2em] text-f1-red">Classification</h2>
                            <div className="f1-card overflow-hidden" style={{ padding: 0 }}>
                                <table className="f1-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '60px' }}>POS</th>
                                            <th>DRIVER</th>
                                            <th className="hide-mobile" style={{ textAlign: 'center' }}>GRID</th>
                                            <th style={{ textAlign: 'right' }}>POINTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((res, idx) => (
                                            <tr key={idx} onClick={() => handleDriverClick(res)} style={{ cursor: 'pointer' }}>
                                                <td className="pos-number font-black italic">P{res.position}</td>
                                                <td>
                                                    <div className="flex items-center gap-small">
                                                        <div style={{ width: '3px', height: '18px', background: res.driver_color || 'var(--text-muted)' }} />
                                                        <span className="text-f1-bold italic uppercase">{res.driver_name}</span>
                                                        <div className="flex gap-2 ml-2">
                                                            {res.is_dnf && <span className="bg-f1-red text-white text-[8px] px-1.5 py-0.5 rounded font-black">DNF</span>}
                                                            {res.fastest_lap && !res.is_dnf && <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black">FL</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hide-mobile text-center font-mono opacity-40 text-sm">
                                                    {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                                </td>
                                                <td className="text-right">
                                                    <span className="text-f1-bold text-xl italic text-f1-red">{res.points_earned}</span>
                                                    <span className="text-[10px] ml-1 opacity-20 font-black">PTS</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Overview Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-medium">
                            <div className="f1-card">
                                <h3 className="text-f1-bold text-[10px] mb-8 uppercase tracking-widest text-f1-red">Position Evolution</h3>
                                <div className="h-[300px]">
                                    <LapPositionChart 
                                        participants={analysisData?.participants || []}
                                        history={analysisData?.positionHistory || []}
                                        totalLaps={graphData.length > 0 ? graphData[graphData.length -1].lap_number : 50}
                                    />
                                </div>
                            </div>
                            <div className="f1-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <TyreStrategyChart 
                                    participants={analysisData?.participants || []} 
                                    totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ANALYSIS' && (
                    <div className="flex flex-col gap-large animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Performance Scorecards */}
                        {performanceScores && (
                            <section>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-f1-bold text-xs uppercase tracking-[0.2em] text-f1-red">Driver Performance Profiles</h2>
                                    <div className="text-[10px] text-silver/20 font-mono italic uppercase">Qualitative_Output_V1</div>
                                </div>
                                <PerformanceScorecard scores={performanceScores} drivers={driverList} />
                            </section>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                            <div className="f1-card">
                                <h3 className="text-f1-bold text-[10px] mb-8 uppercase tracking-widest text-f1-red">Pace Analysis</h3>
                                <div className="h-[400px]">
                                    <RacePaceChart laps={sessionLaps} />
                                </div>
                            </div>
                            <div className="f1-card">
                                <h3 className="text-f1-bold text-[10px] mb-8 uppercase tracking-widest text-f1-red">Distance Delta (Gap to Leader)</h3>
                                <div className="h-[400px]">
                                    <GapToLeaderChart laps={sessionLaps} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'SETUPS' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <section>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-f1-bold text-xs uppercase tracking-[0.2em] text-f1-red">Engineering & Setup Analysis</h2>
                                <div className="text-[10px] text-silver/20 font-mono italic uppercase">Packet_05_CarSetups</div>
                            </div>
                            <CarSetupViewer setups={carSetups} />
                        </section>
                    </div>
                )}

                {activeTab === 'SPEEDTRAPS' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                         <section>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-f1-bold text-xs uppercase tracking-[0.2em] text-f1-red">Velocimetry Data (Speed Traps)</h2>
                                <div className="text-[10px] text-silver/20 font-mono italic uppercase">Packet_03_EventPackets</div>
                            </div>
                            <SpeedTrapOverview traps={speedTraps} />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RaceDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="text-f1-bold animate-pulse text-2xl opacity-50 tracking-widest uppercase italic">RECONSTRUCTING RACE FABRIC...</div>
            </div>
        }>
            <RaceDetailContent />
        </Suspense>
    );
}
