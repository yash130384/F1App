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
        <div className="flex flex-col gap-small w-full overflow-x-auto">
            <div className="flex flex-col gap-small min-w-[600px]">
                {participantsWithMergedStints.map((p, i) => (
                    <div key={p.game_name} className="flex items-center gap-medium">
                        <div className="flex items-center gap-small" style={{ width: '160px', flexShrink: 0 }}>
                            <span className="text-f1-bold" style={{ width: '30px', color: 'var(--f1-red)', fontSize: '0.75rem' }}>P{p.position}</span>
                            <span className="text-f1-bold truncate" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                {p.driver_name || p.game_name}
                            </span>
                        </div>
                        <div className="relative flex-1 flex h-6 bg-glass-surface rounded-sm overflow-hidden" 
                             style={{ border: '1px solid var(--glass-border)' }}>
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
                                            background: COMPOUND_COLORS[stint.visual_compound] || 'var(--text-muted)',
                                            color: '#000',
                                            fontSize: '0.65rem',
                                            opacity: 0.95,
                                            borderRight: '1px solid rgba(0,0,0,0.1)'
                                        }}
                                        title={`Stint ${idx + 1}: Lap ${start}-${end} (${COMPOUND_LABELS[stint.visual_compound]})`}
                                    >
                                        {width > 3 && COMPOUND_LABELS[stint.visual_compound]}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="stat-label" style={{ width: '40px', textAlign: 'right', fontSize: '0.65rem' }}>
                            {p.mergedStints.length - 1} 🛑
                        </div>
                    </div>
                ))}
            </div>

            {/* Lap scale at bottom */}
            <div className="flex pt-small mt-small" style={{ marginLeft: '160px', borderTop: '1px solid var(--glass-border)' }}>
                {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                    <div key={pct} className="flex-1 stat-label" style={{ fontSize: '0.6rem' }}>
                        L{Math.round(pct * totalLaps)}
                    </div>
                ))}
            </div>
        </div>
    );
}
