'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getRaceDetails,
    getAllDriversRaceTelemetry,
    getRaceAnalysis
} from '@/lib/actions';
import { TyreStrategyChart } from '@/components/race/TyreStrategyChart';
import { LapPositionChart } from '@/components/race/LapPositionChart';
import GapToLeaderChart from '@/components/analysis/GapToLeaderChart';
import RacePaceChart from '@/components/analysis/RacePaceChart';
import DriverAvatar from '@/components/common/DriverAvatar';
import { useRouter } from 'next/navigation';

function RaceDetailContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const raceId = params.id as string;
    const leagueName = searchParams.get('league') || null;

    const [loading, setLoading] = useState(true);
    const [race, setRace] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [telemetrySessionId, setTelemetrySessionId] = useState<string | null>(null);

    // Data states
    const [graphData, setGraphData] = useState<any[]>([]);
    const [rawLaps, setRawLaps] = useState<any[]>([]);
    const [analysisData, setAnalysisData] = useState<any>(null);

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
                const [graphRes, analysisRes] = await Promise.all([
                    getAllDriversRaceTelemetry(sid),
                    getRaceAnalysis(sid)
                ]);

                if (graphRes.success) {
                    setGraphData(graphRes.laps || []);
                    setRawLaps(graphRes.rawLaps || []);
                }
                if (analysisRes.success) setAnalysisData(analysisRes);
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
            </div>

            <div className="container section-padding pb-32">
                <div className="flex flex-col gap-large animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Session Results Table */}
                    <section>
                        <h2 className="text-f1-bold text-xs mb-6 uppercase tracking-[0.2em] text-f1-red">Official Classification</h2>
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
                                                    <DriverAvatar 
                                                        src={res.avatar_url} 
                                                        name={res.driver_name} 
                                                        size={32} 
                                                        borderColor={res.driver_color}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-f1-bold italic uppercase">{res.driver_name}</span>
                                                        <div className="flex gap-2">
                                                            {res.is_dnf && <span className="bg-f1-red text-white text-[8px] px-1.5 py-0.5 rounded font-black">DNF</span>}
                                                            {res.fastest_lap && !res.is_dnf && <span className="bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black">FL</span>}
                                                        </div>
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

                    {/* Analysis Charts Grid */}
                    <section>
                        <h2 className="text-f1-bold text-xs mb-6 uppercase tracking-[0.2em] text-f1-red">Performance Integration</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-medium">
                            {/* Position Evolution */}
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
                            
                            {/* Tyre Strategy */}
                            <div className="f1-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <h3 className="text-f1-bold text-[10px] p-6 pb-0 uppercase tracking-widest text-f1-red">Tyre Life & Strategy</h3>
                                <div className="max-h-[300px] overflow-y-auto">
                                    <TyreStrategyChart 
                                        participants={analysisData?.participants || []} 
                                        totalLaps={graphData.length > 0 ? graphData[graphData.length - 1].lap_number : 50} 
                                    />
                                </div>
                            </div>

                            {/* Round Time / Race Pace */}
                            <div className="f1-card">
                                <h3 className="text-f1-bold text-[10px] mb-8 uppercase tracking-widest text-f1-red">Round Time Chart (Pace)</h3>
                                <div className="h-[300px]">
                                    <RacePaceChart laps={rawLaps} />
                                </div>
                            </div>

                            {/* Gap to Leader */}
                            <div className="f1-card">
                                <h3 className="text-f1-bold text-[10px] mb-8 uppercase tracking-widest text-f1-red">Gap to Leader Evolution</h3>
                                <div className="h-[300px]">
                                    <GapToLeaderChart laps={rawLaps} />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
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
