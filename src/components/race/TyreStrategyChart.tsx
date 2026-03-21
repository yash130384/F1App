'use client';

import React from 'react';

interface Stint {
    stint_number: number;
    tyre_compound: number;
    visual_compound: number;
    start_lap: number;
    end_lap: number | null;
}

interface Participant {
    game_name: string;
    driver_name?: string;
    position: number;
    stints: Stint[];
}

interface TyreStrategyChartProps {
    participants: Participant[];
    totalLaps: number;
}

const COMPOUND_COLORS: Record<number, string> = {
    16: '#ef4444', 17: '#eab308', 18: '#e5e7eb', 7: '#22c55e', 8: '#3b82f6'
};

const COMPOUND_LABELS: Record<number, string> = {
    16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W'
};

export function TyreStrategyChart({ participants, totalLaps }: TyreStrategyChartProps) {
    const sorted = [...participants].sort((a, b) => a.position - b.position);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            overflowX: 'auto',
        }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 20 }}>
                Race Tyre Strategy Overview
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 600 }}>
                {sorted.map((p, i) => (
                    <div key={p.game_name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 120, fontSize: 11, color: '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ fontWeight: 800, color: '#fff', marginRight: 6 }}>P{p.position}</span>
                            {p.driver_name || p.game_name}
                        </div>
                        <div style={{ 
                            flex: 1, 
                            height: 20, 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: 4, 
                            position: 'relative',
                            display: 'flex',
                        }}>
                            {p.stints.map((stint, idx) => {
                                const start = stint.start_lap;
                                const end = stint.end_lap || totalLaps;
                                const duration = end - start + 1;
                                const left = ((start - 1) / totalLaps) * 100;
                                const width = (duration / totalLaps) * 100;

                                return (
                                    <div 
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            height: '100%',
                                            background: COMPOUND_COLORS[stint.visual_compound] || '#444',
                                            borderLeft: idx > 0 ? '2px solid #1a1a2e' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 9,
                                            fontWeight: 900,
                                            color: '#000',
                                            opacity: 0.9,
                                            borderRadius: idx === 0 ? '4px 0 0 4px' : idx === p.stints.length - 1 ? '0 4px 4px 0' : '0',
                                        }}
                                        title={`Stint ${stint.stint_number}: Lap ${start}-${end} (${COMPOUND_LABELS[stint.visual_compound]})`}
                                    >
                                        {duration > 2 && COMPOUND_LABELS[stint.visual_compound]}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ width: 40, fontSize: 10, color: '#666', textAlign: 'right' }}>
                            {p.stints.length - 1} 🛑
                        </div>
                    </div>
                ))}
            </div>

            {/* Lap scale at bottom */}
            <div style={{ display: 'flex', marginLeft: 132, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 4 }}>
                {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                    <div key={pct} style={{ flex: 1, fontSize: 9, color: '#444', textAlign: 'left' }}>
                        Lap {Math.round(pct * totalLaps)}
                    </div>
                ))}
            </div>
        </div>
    );
}
