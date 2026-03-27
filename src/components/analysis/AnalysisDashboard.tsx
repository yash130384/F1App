'use client';

import React, { useState, useEffect } from 'react';
import { getBestLapsPerSession, getLapSamples, getBestLapForTrack, getSessionLaps } from '@/lib/actions';
import { AnalysisHeader, AnalysisTab } from './AnalysisHeader';
import styles from './AnalysisDashboard.module.css';

// Charts & Detail-Ansichten
import DriverTrace from './DriverTrace';
import TyreAnalysis from './TyreAnalysis';
import GGCircle from './GGCircle';
import RacePaceChart from './RacePaceChart';
import GapToLeaderChart from './GapToLeaderChart';

/** Props für das AnalysisDashboard */
interface AnalysisDashboardProps {
    /** Eindeutige ID der Rennsitzung */
    sessionId: string;
    /** ID der Liga für den Vergleich mit der Golden-Copy */
    leagueId: string;
    /** ID der Rennstrecke zur Ermittlung des Streckenrekords */
    trackId: number;
}

/**
 * Das AnalysisDashboard ist die zentrale Anlaufstelle für die Nachbearbeitung eines Rennens (Post-Race Analysis).
 * Es erlaubt den direkten Vergleich von zwei Fahrern auf Basis ihrer Telemetriedaten.
 * 
 * Funktionen:
 * - Driver Trace (Geschwindigkeit, Gas, Bremse über Distanz)
 * - Race Pace & Gap Analysis (Rundenzeitenvergleich)
 * - Reifen-Thermik (Abnutzung und Temperatur)
 * - G-G Diagramm (Querkräfte beim Einlenken/Bremsen)
 */
export default function AnalysisDashboard({ sessionId, leagueId, trackId }: AnalysisDashboardProps) {
    // Grunddaten der Sitzung
    const [bestLaps, setBestLaps] = useState<any[]>([]);
    const [goldenLap, setGoldenLap] = useState<any>(null);
    const [allSessionLaps, setAllSessionLaps] = useState<any[]>([]);
    
    // Auswahlzustand für den Vergleich
    const [selectedLap1, setSelectedLap1] = useState<string>('');
    const [selectedLap2, setSelectedLap2] = useState<string>('');
    const [samples1, setSamples1] = useState<any[]>([]);
    const [samples2, setSamples2] = useState<any[]>([]);
    
    // UI-Zustand (Loading & Navigation)
    const [loading, setLoading] = useState(true);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [activeTab, setActiveTab] = useState<AnalysisTab>('trace');

    // Initiales Laden der Bestzeiten und des Streckenrekords
    useEffect(() => {
        async function loadInitialData() {
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
                // Falls keine GoldenCopy vorhanden, nimm den zweitschnellsten Fahrer
                setSelectedLap2(sessionRes.bestLaps[1].lap_id);
            }

            if (allLapsRes.success) {
                setAllSessionLaps(allLapsRes.laps || []);
            }
            setLoading(false);
        }
        loadInitialData();
    }, [sessionId, leagueId, trackId]);

    // Nachladen von hochfrequenten Telemetrie-Samples bei Auswahländerung
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

    // Informationen für Labels in den Charts finden
    const lap1Info = bestLaps.find(l => l.lap_id === selectedLap1);
    const lap2Info = bestLaps.find(l => l.lap_id === selectedLap2) || (selectedLap2 === goldenLap?.lap_id ? goldenLap : null);

    if (loading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.loadingText}>Analysiere Daten...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Navigations- und Auswahlheader */}
            <AnalysisHeader 
                bestLaps={bestLaps}
                goldenLap={goldenLap}
                selectedLap1={selectedLap1}
                selectedLap2={selectedLap2}
                onSelectLap1={setSelectedLap1}
                onSelectLap2={setSelectedLap2}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Inhaltsbereich mit Tab-Inhalten */}
            <main className={`${styles.content} fade-in`}>
                {loadingSamples ? (
                    <div className={styles.loadingWrapper}>
                        <div className={styles.loadingText}>Lade Telemetrie-Daten...</div>
                    </div>
                ) : (
                    <>
                        {/* Driver Trace - Vergleich von Geschwindigkeit & Inputs über die Distanz */}
                        {activeTab === 'trace' && samples1.length > 0 && (
                            <DriverTrace 
                                data1={samples1} 
                                data2={samples2} 
                                label1={lap1Info?.driver_name || (lap1Info?.game_name || 'Fahrer 1')} 
                                label2={lap2Info?.driver_name || (lap2Info?.game_name || 'Fahrer 2')} 
                                color1={lap1Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap1Info?.driver_color || '#e10600')} 
                                color2={lap2Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap2Info?.driver_color || '#3b82f6')} 
                            />
                        )}

                        {/* Race Pace - Visualisierung aller verfügbaren Rundenzeiten */}
                        {activeTab === 'pace' && (
                            <RacePaceChart laps={allSessionLaps} />
                        )}

                        {/* Gap Analysis - Durchschnittlicher Rückstand über das Rennen */}
                        {activeTab === 'gap' && (
                            <GapToLeaderChart laps={allSessionLaps} />
                        )}

                        {/* Reifen-Analyse - Thermik und Verschleiß (Böden und Oberflächen) */}
                        {activeTab === 'tyres' && (
                            <div className="flex flex-col gap-12">
                               <TyreAnalysis samples={samples1} driverName={lap1Info?.driver_name || 'Fahrer 1'} />
                               {samples2.length > 0 && (
                                   <div className="pt-12 border-t border-white/5">
                                       <TyreAnalysis samples={samples2} driverName={lap2Info?.driver_name || 'Fahrer 2'} />
                                   </div>
                               )}
                            </div>
                        )}

                        {/* G-G Diagramm - Belastungsgrenzen des Fahrzeugs (Traction Circle) */}
                        {activeTab === 'gg' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <GGCircle 
                                    samples={samples1} 
                                    driverName={lap1Info?.driver_name || 'Fahrer 1'} 
                                    color={lap1Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap1Info?.driver_color || '#e10600')} 
                                />
                                {samples2.length > 0 && (
                                    <GGCircle 
                                        samples={samples2} 
                                        driverName={lap2Info?.driver_name || 'Fahrer 2'} 
                                        color={lap2Info?.lap_id === goldenLap?.lap_id ? '#fbbf24' : (lap2Info?.driver_color || '#3b82f6')} 
                                    />
                                )}
                            </div>
                        )}

                        {/* Fallback bei fehlenden Daten */}
                        {samples1.length === 0 && (
                            <div className={styles.emptyState}>
                                <h3 className="text-xl mb-4 text-white">Keine Telemetrie verfügbar.</h3>
                                <p>Die Datenaufzeichnung für diese Sitzung ist unvollständig oder es sind keine hochfrequenten Samples vorhanden.</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
