'use client';

import React, { useState, useEffect } from 'react';
import { getBestLapsPerSession, getLapSamples, getBestLapForTrack, getSessionLaps } from '@/lib/actions';
import DriverTrace from './DriverTrace';
import TyreAnalysis from './TyreAnalysis';
import GGCircle from './GGCircle';
import RacePaceChart from './RacePaceChart';
import GapToLeaderChart from './GapToLeaderChart';

interface AnalysisDashboardProps {
    sessionId: string;
    leagueId: string;
    trackId: number;
}

export default function AnalysisDashboard({ sessionId, leagueId, trackId }: AnalysisDashboardProps) {
    const [bestLaps, setBestLaps] = useState<any[]>([]);
    const [goldenLap, setGoldenLap] = useState<any>(null);
    const [selectedLap1, setSelectedLap1] = useState<string>('');
    const [selectedLap2, setSelectedLap2] = useState<string>('');
    const [samples1, setSamples1] = useState<any[]>([]);
    const [samples2, setSamples2] = useState<any[]>([]);
    const [allSessionLaps, setAllSessionLaps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [activeTab, setActiveTab] = useState<'trace' | 'tyres' | 'gg' | 'pace' | 'gap'>('trace');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [sessionRes, trackRes, allLapsRes] = await Promise.all([
                getBestLapsPerSession(sessionId),
                getBestLapForTrack(leagueId, trackId),
                getSessionLaps(sessionId)
            ]);

            if (sessionRes.success) {
                setBestLaps(sessionRes.bestLaps || []);
                if (sessionRes.bestLaps && sessionRes.bestLaps.length > 0) {
                    setSelectedLap1(sessionRes.bestLaps[0].lap_id);
                }
            }

            if (trackRes.success && trackRes.lap) {
                setGoldenLap(trackRes.lap);
                setSelectedLap2(trackRes.lap.lap_id);
            } else if (sessionRes.success && sessionRes.bestLaps && sessionRes.bestLaps.length > 1) {
                setSelectedLap2(sessionRes.bestLaps[1].lap_id);
            }

            if (allLapsRes.success) {
                setAllSessionLaps(allLapsRes.laps || []);
            }

            setLoading(false);
        }
        loadData();
    }, [sessionId, leagueId, trackId]);

    useEffect(() => {
        async function loadSamples() {
            if (!selectedLap1) return;
            setLoadingSamples(true);
            
            const [res1, res2] = await Promise.all([
                getLapSamples(selectedLap1),
                selectedLap2 ? getLapSamples(selectedLap2) : Promise.resolve({ success: true, samples: [] })
            ]);

            if (res1.success) setSamples1(res1.samples);
            if (res2.success) setSamples2(res2.samples);
            
            setLoadingSamples(false);
        }
        loadSamples();
    }, [selectedLap1, selectedLap2]);

    const lap1Info = bestLaps.find(l => l.lap_id === selectedLap1);
    const lap2Info = bestLaps.find(l => l.lap_id === selectedLap2);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="text-f1 animate-pulse text-2xl">Lade Telemetrie-Daten...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex flex-col gap-4 w-full md:w-auto">
                    <div className="flex flex-col">
                        <label className="text-slate-500 text-[10px] uppercase font-bold mb-1">Referenz-Runde (Fahrer 1)</label>
                        <select 
                            value={selectedLap1} 
                            onChange={(e) => setSelectedLap1(e.target.value)}
                            className="bg-slate-800 text-white p-2 rounded-lg border border-white/10 outline-none focus:border-f1-red transition-all"
                        >
                            {bestLaps.map(l => (
                                <option key={l.lap_id} value={l.lap_id}>
                                    {l.driver_name || l.game_name} - {l.lap_time_ms / 1000}s (Runde {l.lap_number})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-slate-500 text-[10px] uppercase font-bold mb-1">Vergleichs-Runde (Fahrer 2)</label>
                        <select 
                            value={selectedLap2} 
                            onChange={(e) => setSelectedLap2(e.target.value)}
                            className="bg-slate-800 text-white p-2 rounded-lg border border-white/10 outline-none focus:border-f1-red transition-all"
                        >
                            <option value="">Kein Vergleich</option>
                            {goldenLap && (
                                <option value={goldenLap.lap_id} className="text-yellow-400 font-bold">
                                    🌟 GOLDEN COPY ({goldenLap.driver_name || goldenLap.game_name} - {goldenLap.lap_time_ms / 1000}s)
                                </option>
                            )}
                            {bestLaps.filter(l => l.lap_id !== selectedLap1 && l.lap_id !== goldenLap?.lap_id).map(l => (
                                <option key={l.lap_id} value={l.lap_id}>
                                    {l.driver_name || l.game_name} - {l.lap_time_ms / 1000}s (Runde {l.lap_number})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-xl border border-white/5 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('trace')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'trace' ? 'bg-f1-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Driver Trace
                    </button>
                    <button 
                        onClick={() => setActiveTab('pace')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'pace' ? 'bg-f1-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Race Pace
                    </button>
                    <button 
                        onClick={() => setActiveTab('gap')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'gap' ? 'bg-f1-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Gap Analysis
                    </button>
                    <button 
                        onClick={() => setActiveTab('tyres')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'tyres' ? 'bg-f1-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Reifen
                    </button>
                    <button 
                        onClick={() => setActiveTab('gg')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'gg' ? 'bg-f1-red text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        G-G Diagramm
                    </button>
                </div>
            </header>

            {loadingSamples ? (
                <div className="flex items-center justify-center p-20 f1-card">
                    <div className="text-white animate-pulse">Analysiere Kurven...</div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'trace' && samples1.length > 0 && (
                        <DriverTrace 
                            data1={samples1} 
                            data2={samples2} 
                            label1={lap1Info?.driver_name || (lap1Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : (lap1Info?.game_name || 'Fahrer 1'))} 
                            label2={lap2Info?.driver_name || (lap2Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : (lap2Info?.game_name || 'Fahrer 2'))} 
                            color1={lap1Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap1Info?.driver_color || '#e10600')} 
                            color2={lap2Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap2Info?.driver_color || '#3b82f6')} 
                        />
                    )}

                    {activeTab === 'pace' && (
                        <RacePaceChart laps={allSessionLaps} />
                    )}

                    {activeTab === 'gap' && (
                        <GapToLeaderChart laps={allSessionLaps} />
                    )}

                    {activeTab === 'tyres' && (
                        <div className="flex flex-col gap-8">
                           <TyreAnalysis samples={samples1} driverName={lap1Info?.driver_name || (lap1Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : 'Fahrer 1')} />
                           {samples2.length > 0 && (
                               <div className="pt-8 border-t border-white/10">
                                   <TyreAnalysis samples={samples2} driverName={lap2Info?.driver_name || (lap2Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : 'Fahrer 2')} />
                               </div>
                           )}
                        </div>
                    )}

                    {activeTab === 'gg' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <GGCircle 
                                samples={samples1} 
                                driverName={lap1Info?.driver_name || (lap1Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : 'Fahrer 1')} 
                                color={lap1Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap1Info?.driver_color || '#e10600')} 
                            />
                            {samples2.length > 0 && (
                                <GGCircle 
                                    samples={samples2} 
                                    driverName={lap2Info?.driver_name || (lap2Info?.lap_id === goldenLap?.lap_id ? '🌟 Golden Copy' : 'Fahrer 2')} 
                                    color={lap2Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap2Info?.driver_color || '#3b82f6')} 
                                />
                            )}
                        </div>
                    )}

                    {samples1.length === 0 && (
                        <div className="f1-card text-center p-20 opacity-50">
                            <h3 className="text-xl mb-2">Keine Telemetrie-Daten verfügbar</h3>
                            <p className="text-sm">Für diese Runde wurden keine hochfrequenten Samples aufgezeichnet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
