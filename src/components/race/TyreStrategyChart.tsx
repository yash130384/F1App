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
    16: '#ef4444', 17: '#eab308', 18: '#e5e7eb', 7: '#22c55e', 8: '#3b82f6',
    19: '#ec4899', 20: '#ef4444', 21: '#eab308', 22: '#e5e7eb'
};

const COMPOUND_LABELS: Record<number, string> = {
    16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W',
    19: 'SS', 20: 'S', 21: 'M', 22: 'H'
};

export function TyreStrategyChart({ participants, totalLaps }: TyreStrategyChartProps) {
    const participantsWithMergedStints = React.useMemo(() => {
        return [...participants].sort((a, b) => a.position - b.position).map(p => {
            const mergedStints: Stint[] = [];
            p.stints.forEach(stint => {
                const last = mergedStints[mergedStints.length - 1];
                if (last && last.visual_compound === stint.visual_compound) {
                    last.end_lap = stint.end_lap || totalLaps;
                } else {
                    mergedStints.push({ ...stint, end_lap: stint.end_lap || totalLaps });
                }
            });
            return { ...p, mergedStints };
        });
    }, [participants, totalLaps]);

    return (
        <div className="flex flex-col gap-medium w-full overflow-x-auto p-medium glass-panel" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex flex-col gap-small min-w-[700px]">
                {participantsWithMergedStints.map((p, i) => (
                    <div key={p.game_name} className="flex items-center gap-medium group hover:bg-white/5 transition-colors p-xsmall rounded-sm">
                        <div className="flex items-center gap-medium" style={{ width: '220px', flexShrink: 0 }}>
                            <span className="text-f1-bold" style={{ width: '35px', color: 'var(--f1-red)', fontSize: '0.8rem' }}>P{p.position}</span>
                            <span className="text-f1-bold" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.driver_name || p.game_name}
                            </span>
                        </div>
                        <div className="relative flex-1 flex h-8 bg-black/40 rounded-sm overflow-hidden" 
                             style={{ border: '1px solid var(--glass-border)', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                            {p.mergedStints.map((stint, idx) => {
                                const start = stint.start_lap;
                                const end = stint.end_lap || totalLaps;
                                const duration = end - start + 1;
                                const left = ((start - 1) / totalLaps) * 100;
                                const width = (duration / totalLaps) * 100;

                                return (
                                    <div 
                                        key={idx}
                                        className="absolute flex items-center justify-center text-f1-bold"
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            height: '100%',
                                            background: `linear-gradient(to bottom, ${COMPOUND_COLORS[stint.visual_compound]}dd, ${COMPOUND_COLORS[stint.visual_compound]})`,
                                            color: stint.visual_compound === 18 ? '#000' : '#fff',
                                            fontSize: '0.7rem',
                                            opacity: 0.9,
                                            borderRight: '2px solid rgba(0,0,0,0.3)',
                                            boxShadow: 'inset 0 0 5px rgba(255,255,255,0.2)'
                                        }}
                                        title={`Stint ${idx + 1}: Lap ${start}-${end} (${COMPOUND_LABELS[stint.visual_compound]})`}
                                    >
                                        {width > 4 && COMPOUND_LABELS[stint.visual_compound]}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-xsmall stat-label" style={{ width: '60px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.8rem' }}>{p.mergedStints.length - 1}</span>
                            <span style={{ fontSize: '1rem', filter: 'grayscale(0.5)' }}>🛑</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lap scale at bottom */}
            <div className="flex relative h-6 mt-medium" style={{ marginLeft: '220px', borderTop: '2px solid var(--f1-red)' }}>
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map(pct => (
                    <div 
                        key={pct} 
                        className="absolute stat-label" 
                        style={{ 
                            left: `${pct * 100}%`, 
                            transform: 'translateX(-50%)',
                            fontSize: '0.65rem',
                            paddingTop: '8px'
                        }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-f1-red"></div>
                        L{Math.round(pct * totalLaps)}
                    </div>
                ))}
            </div>
        </div>
    );
}
