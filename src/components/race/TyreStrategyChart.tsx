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

// F1 official styleguide colors (from Image 2)
const COMPOUND_COLORS: Record<number, string> = {
    16: '#e10600', // S (Red)
    17: '#f5c600', // M (Yellow)
    18: '#f0f0f0', // H (White)
    7:  '#39b54a', // I (Green)
    8:  '#0067ff', // W (Blue)
    19: '#ff5cbb', // SS
    20: '#e10600', // S
    21: '#f5c600', // M
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
    // 1. Group to ensure one row per driver
    const sortedParticipants = React.useMemo(() => {
        const driverMap = new Map<string, Participant>();
        participants.forEach(p => {
            const name = p.driver_name || p.game_name;
            if (!driverMap.has(name)) {
                driverMap.set(name, { ...p, stints: [...p.stints] });
            } else {
                const existing = driverMap.get(name)!;
                p.stints.forEach(s => {
                    if (!existing.stints.find(es => es.start_lap === s.start_lap)) {
                        existing.stints.push(s);
                    }
                });
                if (p.position < existing.position) existing.position = p.position;
            }
        });

        return Array.from(driverMap.values())
            .sort((a, b) => a.position - b.position)
            .map(p => {
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
        sortedParticipants.forEach(p => {
            p.mergedStints.forEach(s => {
                if (s.end_lap && s.end_lap > max) max = s.end_lap;
            });
        });
        return max || totalLaps;
    }, [sortedParticipants, totalLaps]);

    // 2. Generate exactly 5 major lap ticks for the X-Achse (Image 2 style)
    const ticks = React.useMemo(() => {
        const count = 5;
        const result = [];
        for (let i = 0; i < count; i++) {
            const pct = i / (count - 1);
            const lapValue = Math.max(1, Math.round(pct * effectiveMaxLaps));
            result.push(lapValue);
        }
        return result;
    }, [effectiveMaxLaps]);

    return (
        <div className="flex flex-col gap-large w-full p-large glass-panel" style={{ background: 'rgba(5,5,7,0.95)', border: 'none' }}>
            {/* Header (dashboard style) */}
            <h3 className="text-f1-bold mb-large" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>
                TYRE STRATEGY ANALYSIS
            </h3>

            {/* Legend */}
            <div className="flex gap-large items-center mb-medium py-3 border-t border-b border-white/5">
                {[16, 17, 18].map(cid => (
                    <div key={cid} className="flex items-center gap-small">
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COMPOUND_COLORS[cid] }} />
                        <span className="text-mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {COMPOUND_NAMES[cid]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Strategy Grid (Driver | Bar) */}
            <div className="flex flex-col gap-medium mt-medium">
                {sortedParticipants.map((p) => (
                    <div key={p.game_name} className="flex items-center gap-large">
                        {/* Driver Name (Styleguide style: Left aligned, fixed width) */}
                        <div style={{ width: '150px', flexShrink: 0 }}>
                            <span className="text-mono font-bold" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                                {(p.driver_name || p.game_name).toUpperCase()}
                            </span>
                        </div>

                        {/* Bar Timeline */}
                        <div className="relative flex-1 h-8 bg-white/5 overflow-hidden flex" style={{ boxShadow: '0 0 1px rgba(255,255,255,0.1)' }}>
                            {p.mergedStints.map((stint, idx) => {
                                const prevEnd = idx > 0 ? p.mergedStints[idx-1].end_lap! : 0;
                                const gap = stint.start_lap - (prevEnd + 1);
                                const duration = (stint.end_lap || effectiveMaxLaps) - stint.start_lap + 1;
                                
                                const widthPct = (duration / effectiveMaxLaps) * 100;
                                const gapPct = (gap > 0) ? (gap / effectiveMaxLaps) * 100 : 0;

                                return (
                                    <React.Fragment key={idx}>
                                        {gapPct > 0 && <div style={{ width: `${gapPct}%`, height: '100%' }} />}
                                        <div 
                                            className="h-full flex items-center px-4 flex-shrink-0"
                                            style={{
                                                width: `${widthPct}%`,
                                                background: COMPOUND_COLORS[stint.visual_compound],
                                                color: stint.visual_compound === 18 ? '#000' : '#fff',
                                                borderLeft: '1px solid rgba(0,0,0,0.1)',
                                                borderRight: '1px solid rgba(0,0,0,0.15)',
                                            }}
                                        >
                                            <span className="text-mono font-black" style={{ fontSize: '0.8rem', opacity: 1 }}>
                                                {COMPOUND_LABELS[stint.visual_compound]}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* X-Axis Footer (Image 2 logic) */}
            <div className="flex items-center gap-large pt-medium">
                {/* Spacer for Name Column */}
                <div style={{ width: '150px', flexShrink: 0 }} />
                
                {/* Horizontal Tick Bar (Spread equally) */}
                <div className="flex-1 relative h-6">
                    <div className="absolute inset-0 flex justify-between items-end">
                        {ticks.map((lap, i) => (
                            <div 
                                key={i} 
                                className="text-mono" 
                                style={{ 
                                    fontSize: '0.65rem', 
                                    color: 'var(--text-muted)',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em'
                                }}
                            >
                                LAP {lap}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
