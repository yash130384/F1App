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

// Colors from F1 standard palette (Image 2 style)
const COMPOUND_COLORS: Record<number, string> = {
    16: '#e10600', // S
    17: '#ffd200', // M
    18: '#f0f0f0', // H
    7:  '#47b031', // I
    8:  '#0067ff', // W
    19: '#ff5cbb', // SS
    20: '#e10600', // S
    21: '#ffd200', // M
    22: '#f0f0f0'  // H
};

const COMPOUND_LABELS: Record<number, string> = {
    16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W',
    19: 'SS', 20: 'S', 21: 'M', 22: 'H'
};

const COMPOUND_NAMES: Record<number, string> = {
    16: 'SOFT (S)', 17: 'MEDIUM (M)', 18: 'HARD (H)', 
    7: 'INTER (I)', 8: 'WET (W)'
};

export function TyreStrategyChart({ participants, totalLaps }: TyreStrategyChartProps) {
    // Aggressively group participants by driver to ensure ONE ROW PER DRIVER
    const groupedParticipants = React.useMemo(() => {
        const driverMap = new Map<string, Participant>();

        participants.forEach(p => {
            const name = p.driver_name || p.game_name;
            if (!driverMap.has(name)) {
                driverMap.set(name, { ...p, stints: [...p.stints] });
            } else {
                const existing = driverMap.get(name)!;
                // Add stints that aren't already there
                p.stints.forEach(s => {
                    if (!existing.stints.find(es => es.start_lap === s.start_lap)) {
                        existing.stints.push(s);
                    }
                });
                // Keep the best position
                if (p.position < existing.position) existing.position = p.position;
            }
        });

        return Array.from(driverMap.values())
            .sort((a, b) => a.position - b.position)
            .map(p => {
                // Merge consecutive stints of same compound
                const sortedStints = [...p.stints].sort((a, b) => a.start_lap - b.start_lap);
                const mergedStints: Stint[] = [];
                
                sortedStints.forEach(stint => {
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

    const effectiveMaxLaps = React.useMemo(() => {
        let max = 0;
        groupedParticipants.forEach(p => {
            p.mergedStints.forEach(s => {
                if (s.end_lap && s.end_lap > max) max = s.end_lap;
            });
        });
        return max || totalLaps;
    }, [groupedParticipants, totalLaps]);

    const ticks = React.useMemo(() => {
        const count = 5;
        const result = [];
        for (let i = 0; i < count; i++) {
            const pct = i / (count - 1);
            result.push(Math.max(1, Math.round(pct * effectiveMaxLaps)));
        }
        return result;
    }, [effectiveMaxLaps]);

    return (
        <div className="flex flex-col gap-large w-full p-large glass-panel" style={{ background: 'rgba(5,5,7,0.85)', minHeight: '400px' }}>
            {/* Header - Synced with dashboard style (Red/0.75rem/Uppercase) */}
            <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>
                TYRE STRATEGY ANALYSIS
            </h3>

            {/* Legend */}
            <div className="flex gap-large items-center mb-medium border-t border-b border-white/5 py-4">
                {[16, 17, 18].map(cid => (
                    <div key={cid} className="flex items-center gap-small">
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COMPOUND_COLORS[cid], boxShadow: `0 0 10px ${COMPOUND_COLORS[cid]}44` }} />
                        <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            {COMPOUND_NAMES[cid]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Chart Grid */}
            <div className="flex flex-col gap-medium">
                {groupedParticipants.map((p) => (
                    <div key={p.game_name} className="grid items-center" style={{ gridTemplateColumns: '180px 1fr', gap: '2rem' }}>
                        {/* Driver Name (Right Aligned) */}
                        <div className="text-right">
                            <span className="text-f1-bold text-mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', opacity: 0.8 }}>
                                {p.driver_name?.toUpperCase() || p.game_name.toUpperCase()}
                            </span>
                        </div>

                        {/* Strategy Bar (Full Width - Single Row) */}
                        <div className="relative h-7 w-full bg-white/5 overflow-hidden" style={{ border: 'none' }}>
                            {p.mergedStints.map((stint, idx) => {
                                const start = stint.start_lap;
                                const end = stint.end_lap || effectiveMaxLaps;
                                const duration = end - start + 1;
                                const left = ((start - 1) / effectiveMaxLaps) * 100;
                                const width = (duration / effectiveMaxLaps) * 100;

                                return (
                                    <div 
                                        key={idx}
                                        className="absolute h-full flex items-center px-3"
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            background: COMPOUND_COLORS[stint.visual_compound],
                                            color: stint.visual_compound === 18 ? '#000' : '#fff',
                                            borderRight: '1px solid rgba(0,0,0,0.15)',
                                            transition: 'all 0.4s ease'
                                        }}
                                    >
                                        <span className="text-mono font-black" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                            {COMPOUND_LABELS[stint.visual_compound]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lap Scale at Footer */}
            <div className="grid mt-medium" style={{ gridTemplateColumns: '180px 1fr', gap: '2rem' }}>
                <div />
                <div className="relative h-6">
                    {ticks.map((lap, i) => {
                        const left = ((lap - 1) / effectiveMaxLaps) * 100;
                        return (
                            <div 
                                key={lap} 
                                className="absolute text-mono" 
                                style={{ 
                                    left: `${left}%`, 
                                    transform: 'translateX(-50%)',
                                    fontSize: '0.65rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                LAP {lap}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
