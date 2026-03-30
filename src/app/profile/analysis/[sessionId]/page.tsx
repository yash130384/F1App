"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getSessionSafetyCarEvents,
    getRaceAnalysis,
    getSessionLaps,
    getCarSetups,
    getSpeedTraps,
    getPerformanceScores,
} from '@/lib/actions';
import GapToLeaderChart from '@/components/analysis/GapToLeaderChart';
import RacePaceChart from '@/components/analysis/RacePaceChart';
import CarSetupViewer from '@/components/analysis/CarSetupViewer';
import SpeedTrapOverview from '@/components/analysis/SpeedTrapOverview';
import PerformanceScorecard from '@/components/analysis/PerformanceScorecard';

type TabType = 'ANALYSIS' | 'SETUPS' | 'SPEEDTRAPS';

function SessionAnalysisContent() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    
    // Wir könnten die spezifische participant ID aus dem Query laden (optional)
    const searchParams = useSearchParams();
    const myPid = searchParams.get('pid');

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('ANALYSIS');

    const [analysisData, setAnalysisData] = useState<any>(null);
    const [sessionLaps, setSessionLaps] = useState<any[]>([]);
    const [carSetups, setCarSetups] = useState<any[]>([]);
    const [speedTraps, setSpeedTraps] = useState<any[]>([]);
    const [performanceScores, setPerformanceScores] = useState<any>(null);

    useEffect(() => { loadSession(); }, [sessionId]);

    async function loadSession() {
        setLoading(true);
        if (sessionId) {
            const [analysisRes, lapsRes, setupsRes, trapsRes, perfRes] = await Promise.all([
                getRaceAnalysis(sessionId),
                getSessionLaps(sessionId),
                getCarSetups(sessionId),
                getSpeedTraps(sessionId),
                getPerformanceScores(sessionId)
            ]);

            if (analysisRes.success) setAnalysisData(analysisRes);
            if (lapsRes.success) setSessionLaps(lapsRes.laps || []);
            if (setupsRes.success) setCarSetups(setupsRes.setups || []);
            if (trapsRes.success) setSpeedTraps(trapsRes.traps || []);
            if (perfRes.success) setPerformanceScores(perfRes.scores);
        }
        setLoading(false);
    }

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
    const driverList = analysisData?.participants?.map((p: any) => ({
        id: p.participant_id,
        name: p.driver_name || `Driver ${p.participant_id.substring(0,4)}`,
        color: p.driver_color || '#fff'
    })) || [];

    return (
        <div className="animate-in fade-in duration-1000">
            {/* ── HEADER ── */}
            <div className="glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
                <div className="container" style={{ padding: '2rem 1.5rem' }}>
                    <div className="flex items-center gap-small mb-medium">
                        <Link href="/profile/analysis" className="stat-label hover-f1" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>
                            MY SESSIONS
                        </Link>
                        <span style={{ color: 'var(--glass-border)', fontSize: '0.8rem' }}>/</span>
                        <span className="text-f1-bold font-italic" style={{ color: 'var(--text-primary)', fontSize: '0.7rem' }}>SESSION DEEP DIVE</span>
                    </div>
                    
                    <div className="flex justify-between items-end flex-wrap gap-medium">
                        <div>
                            <h1 className="h1 text-gradient italic font-black" style={{ fontSize: '3rem', marginBottom: '0.25rem', lineHeight: 1 }}>
                                TELEMETRY ANALYSIS
                            </h1>
                            <div className="text-f1-bold" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '2px' }}>
                                SESSION ID: {sessionId}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TAB NAVIGATION ── */}
                <div className="container border-t border-white/5 flex flex-wrap">
                    <TabButton type="ANALYSIS" label="Analyse" />
                    {carSetups.length > 0 && <TabButton type="SETUPS" label="Setups" />}
                    {speedTraps.length > 0 && <TabButton type="SPEEDTRAPS" label="Speed Traps" />}
                </div>
            </div>

            <div className="container section-padding pb-32">
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

export default function SessionAnalysisPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="text-f1-bold animate-pulse text-2xl opacity-50 tracking-widest uppercase italic">RECONSTRUCTING RACE FABRIC...</div>
            </div>
        }>
            <SessionAnalysisContent />
        </Suspense>
    );
}
