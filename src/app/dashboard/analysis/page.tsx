'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { getAllLeagues, getTelemetrySessionsForLeague } from '@/lib/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard';

function AnalysisContent() {
    const [leagues, setLeagues] = useState<any[]>([]);
    const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        async function loadLeagues() {
            setLoading(true);
            const res = await getAllLeagues();
            if (res.success) {
                setLeagues(res.leagues || []);
                const leagueParam = searchParams.get('leagueId');
                if (leagueParam) setSelectedLeagueId(leagueParam);
                else if (res.leagues && res.leagues.length > 0) setSelectedLeagueId(res.leagues[0].id);
            }
            setLoading(false);
        }
        loadLeagues();
    }, [searchParams]);

    useEffect(() => {
        async function loadSessions() {
            if (!selectedLeagueId) return;
            const res = await getTelemetrySessionsForLeague(selectedLeagueId);
            if (res.success) {
                setSessions(res.sessions || []);
                const sessionParam = searchParams.get('sessionId');
                if (sessionParam) setSelectedSessionId(sessionParam);
                else if (res.sessions && res.sessions.length > 0) setSelectedSessionId(res.sessions[0].id);
                else setSelectedSessionId('');
            }
        }
        loadSessions();
    }, [selectedLeagueId, searchParams]);

    const handleLeagueChange = (id: string) => {
        setSelectedLeagueId(id);
        setSelectedSessionId('');
        router.push(`/dashboard/analysis?leagueId=${id}`);
    };

    const handleSessionChange = (id: string) => {
        setSelectedSessionId(id);
        router.push(`/dashboard/analysis?leagueId=${selectedLeagueId}&sessionId=${id}`);
    };

    if (loading) {
        return <div className="p-20 text-center text-f1">Lade Ligen...</div>;
    }

    return (
        <div className="container py-10 animate-in fade-in duration-1000">
            <header className="mb-10 text-center">
                <h1 className="text-f1 text-5xl mb-2 text-gradient">Fahrer-Analyse</h1>
                <p className="text-slate-400 uppercase tracking-widest text-sm font-bold">Deep Telemetry Insights</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="f1-card">
                    <label className="text-f1 text-xs mb-2 block opacity-50">Wähle Liga</label>
                    <select 
                        value={selectedLeagueId} 
                        onChange={(e) => handleLeagueChange(e.target.value)}
                        className="w-full bg-slate-900 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-f1-red transition-all text-lg font-bold"
                    >
                        {leagues.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>
                </div>

                <div className="f1-card">
                    <label className="text-f1 text-xs mb-2 block opacity-50">Wähle Sitzung</label>
                    <select 
                        value={selectedSessionId} 
                        onChange={(e) => handleSessionChange(e.target.value)}
                        className="w-full bg-slate-900 text-white p-3 rounded-xl border border-white/10 outline-none focus:border-f1-red transition-all text-lg font-bold"
                        disabled={sessions.length === 0}
                    >
                        {sessions.length === 0 && <option value="">Keine Sitzungen gefunden</option>}
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.session_type} - {new Date(s.created_at).toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedSessionId ? (
                <div className="pb-20">
                    <AnalysisDashboard 
                        sessionId={selectedSessionId} 
                        leagueId={selectedLeagueId} 
                        trackId={sessions.find(s => s.id === selectedSessionId)?.track_id} 
                    />
                </div>
            ) : (
                <div className="f1-card text-center p-20 opacity-30">
                    <p className="text-xl">Bitte wähle eine Sitzung aus, um mit der Analyse zu beginnen.</p>
                </div>
            )}
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center text-f1">Lade Analyse...</div>}>
            <AnalysisContent />
        </Suspense>
    );
}

