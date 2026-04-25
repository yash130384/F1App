'use client';

import React from 'react';
import styles from './AnalysisDashboard.module.css';

/** Tab-Typen für das Analysis Dashboard */
export type AnalysisTab = 'trace' | 'tyres' | 'gg' | 'pace' | 'gap';

/** Props für den Analysis Header */
interface AnalysisHeaderProps {
    /** Die Liste aller verfügbaren Bestzeiten in der Session */
    bestLaps: any[];
    /** Die global verfügbare "Golden Copy" (Referenz-Runde für den Track) */
    goldenLap: any | null;
    /** ID der aktuell ausgewählten ersten Runde (Referenz) */
    selectedLap1: string;
    /** ID der aktuell ausgewählten zweiten Runde (Vergleich) */
    selectedLap2: string;
    /** Callback zum Ändern der ersten Runde */
    onSelectLap1: (id: string) => void;
    /** Callback zum Ändern der zweiten Runde */
    onSelectLap2: (id: string) => void;
    /** Der aktuell aktive Ansichts-Tab */
    activeTab: AnalysisTab;
    /** Callback zum Wechseln der Ansicht */
    onTabChange: (tab: AnalysisTab) => void;
}

/**
 * Der AnalysisHeader bildet die Steuerungszentrale des Dashboards.
 * Er ermöglicht die Auswahl von zwei Runden zum direkten Vergleich
 * sowie das Umschalten zwischen verschiedenen Analyse-Ansichten.
 */
export function AnalysisHeader({
    bestLaps,
    goldenLap,
    selectedLap1,
    selectedLap2,
    onSelectLap1,
    onSelectLap2,
    activeTab,
    onTabChange
}: AnalysisHeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.selectionArea}>
                {/* Auswahl Referenz-Runde (Fahrer 1) */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Referenz (Fahrer 1)</label>
                    <select 
                        value={selectedLap1} 
                        onChange={(e) => onSelectLap1(e.target.value)}
                        className={styles.select}
                    >
                        {bestLaps.map(l => (
                            <option key={l.lapId} value={l.lapId}>
                                {l.driverName || l.gameName} — {l.lapTimeMs / 1000}s (R{l.lapNumber})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Auswahl Vergleichs-Runde (Fahrer 2) */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Vergleich (Fahrer 2)</label>
                    <select 
                        value={selectedLap2} 
                        onChange={(e) => onSelectLap2(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Kein Vergleich</option>
                        {goldenLap && (
                            <option value={goldenLap.lapId} style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                                🌟 GOLDEN COPY ({goldenLap.driverName || goldenLap.gameName})
                            </option>
                        )}
                        {bestLaps
                            .filter(l => l.lapId !== selectedLap1 && l.lapId !== goldenLap?.lapId)
                            .map(l => (
                                <option key={l.lapId} value={l.lapId}>
                                    {l.driverName || l.gameName} — {l.lapTimeMs / 1000}s (R{l.lapNumber})
                                </option>
                            ))
                        }
                    </select>
                </div>
            </div>

            {/* Navigationstabs für verschiedene Telemetrie-Ansichten */}
            <nav className={styles.tabList}>
                <TabButton id="trace" label="Driver Trace" active={activeTab} onClick={onTabChange} />
                <TabButton id="pace" label="Race Pace" active={activeTab} onClick={onTabChange} />
                <TabButton id="gap" label="Gap Analysis" active={activeTab} onClick={onTabChange} />
                <TabButton id="tyres" label="Reifen" active={activeTab} onClick={onTabChange} />
                <TabButton id="gg" label="G-G Diagramm" active={activeTab} onClick={onTabChange} />
            </nav>
        </header>
    );
}

/** Einzelner Tab-Button für das Dashboard */
function TabButton({ id, label, active, onClick }: { id: AnalysisTab, label: string, active: AnalysisTab, onClick: (id: AnalysisTab) => void }) {
    return (
        <button 
            onClick={() => onClick(id)}
            className={`${styles.tabButton} ${active === id ? styles.tabActive : ''}`}
        >
            {label}
        </button>
    );
}
