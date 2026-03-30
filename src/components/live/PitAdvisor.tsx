'use client';

import React from 'react';

interface TyreSetData {
    actualTyreCompound: number;
    visualTyreCompound: number;
    wear: number;
    available: number;
    recommendedSession: number;
    lifeSpan: number;
    usableLife: number;
    lapDeltaTime: number;
    fitted: number;
}

interface PitAdvisorProps {
    idealLap: number;
    latestLap: number;
    rejoinPos: number;
    currentLap: number;
    tyreSets?: TyreSetData[];
}

const COMPOUND_COLORS: Record<number, string> = {
    16: '#ef4444', 17: '#eab308', 18: '#e5e7eb', 7: '#22c55e', 8: '#3b82f6'
};

const COMPOUND_LABELS: Record<number, string> = {
    16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W'
};

export function PitAdvisor({ idealLap, latestLap, rejoinPos, currentLap, tyreSets }: PitAdvisorProps) {
    const isWindowOpen = currentLap >= idealLap && currentLap <= latestLap;
    const isLate = currentLap > latestLap;

    const availableSets = tyreSets?.filter(s => s.available && !s.fitted).sort((a, b) => a.wear - b.wear) || [];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${isWindowOpen ? '#22c55e' : isLate ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: isWindowOpen ? '0 0 15px rgba(34,197,94,0.15)' : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Pit Strategy
                </span>
                {isWindowOpen && (
                    <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 800, animation: 'pulse 1s infinite' }}>
                        🟢 WINDOW OPEN
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>PIT WINDOW</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                        Laps {idealLap} - {latestLap}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>REJOIN POS</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#eab308' }}>
                        P{rejoinPos || '--'}
                    </div>
                </div>
            </div>

            {/* Tyre Sets List */}
            <div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
                    AVAILABLE SETS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableSets.length > 0 ? availableSets.slice(0, 4).map((set, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 18, height: 18, borderRadius: '50%',
                                    border: `2px solid ${COMPOUND_COLORS[set.visualTyreCompound] || '#888'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 900, color: COMPOUND_COLORS[set.visualTyreCompound] || '#888'
                                }}>
                                    {COMPOUND_LABELS[set.visualTyreCompound] || '?'}
                                </span>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{set.wear}% wear</span>
                            </div>
                            <span style={{ color: set.lapDeltaTime <= 0 ? '#22c55e' : '#ef4444', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                                {set.lapDeltaTime > 0 ? '+' : ''}{(set.lapDeltaTime / 1000).toFixed(3)}s
                            </span>
                        </div>
                    )) : (
                        <div style={{ fontSize: 11, color: '#444', fontStyle: 'italic' }}>No additional sets available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
