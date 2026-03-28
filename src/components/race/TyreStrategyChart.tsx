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
    16: '#e10600', 17: '#f5c600', 18: '#f0f0f0', 7: '#39b54a', 8: '#0067ff',
    19: '#ff5cbb', 20: '#e10600', 21: '#f5c600', 22: '#f0f0f0'
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
    // 1. Robust Grouping per Driver (Fixes multiple rows bug)
    const sortedParticipants = React.useMemo(() => {
        const driverMap = new Map<string, Participant & { mergedStints: Stint[] }>();

        participants.forEach(p => {
            const rawName = p.driver_name || p.game_name || 'UNKNOWN';
            const key = rawName.trim().toUpperCase();
            
            if (!driverMap.has(key)) {
                driverMap.set(key, { ...p, stints: [...p.stints], mergedStints: [] });
            } else {
                const existing = driverMap.get(key)!;
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
                const merged: Stint[] = [];
                sortedStints.forEach(stint => {
                    const last = merged[merged.length - 1];
                    if (last && last.visual_compound === stint.visual_compound) {
                        last.end_lap = stint.end_lap || totalLaps;
                    } else {
                        merged.push({ ...stint, end_lap: stint.end_lap || totalLaps });
                    }
                });
                return { ...p, mergedStints: merged };
            });
    }, [participants, totalLaps]);

    const effectiveMaxLaps = React.useMemo(() => {
        let max = 0;
        sortedParticipants.forEach(p => {
            p.mergedStints.forEach(s => {
                const end = s.end_lap || totalLaps;
                if (end > max) max = end;
            });
        });
        return Math.max(max, totalLaps, 1);
    }, [sortedParticipants, totalLaps]);

    // Axis Ticks
    const ticks = React.useMemo(() => {
        const count = 5;
        const result = [];
        for (let i = 0; i < count; i++) {
            const pct = i / (count - 1);
            result.push({ lap: Math.max(1, Math.round(pct * effectiveMaxLaps)), pct: pct * 100 });
        }
        return result;
    }, [effectiveMaxLaps]);

    return (
        <div style={{ width: '100%', padding: '24px', background: 'rgba(5,5,7,0.98)', color: 'white' }}>
            {/* Header */}
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#FF1801', fontStyle: 'italic', letterSpacing: '2px', marginBottom: '24px', textTransform: 'uppercase' }}>
                TYRE STRATEGY ANALYSIS
            </h3>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[16, 17, 18].map(cid => (
                    <div key={cid} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COMPOUND_COLORS[cid] }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#949498', fontFamily: 'monospace' }}>{COMPOUND_NAMES[cid]}</span>
                    </div>
                ))}
            </div>

            {/* Strategy Grid - FORCE GRID 160px 1fr */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {sortedParticipants.map((p) => (
                    <div key={p.game_name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', alignItems: 'center', width: '100%' }}>
                        {/* Driver Name */}
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#949498', fontFamily: 'monospace' }}>
                                {(p.driver_name || p.game_name).toUpperCase()}
                            </span>
                        </div>

                        {/* Stint Timeline Container */}
                        <div style={{ position: 'relative', height: '32px', background: 'rgba(255,255,255,0.03)', width: '100%', overflow: 'hidden' }}>
                            {p.mergedStints.map((stint, idx) => {
                                const endLap = stint.end_lap || effectiveMaxLaps;
                                const leftPct = ((stint.start_lap - 1) / effectiveMaxLaps) * 100;
                                const widthPct = ((endLap - stint.start_lap + 1) / effectiveMaxLaps) * 100;

                                return (
                                    <div 
                                        key={idx}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            height: '100%',
                                            left: `${leftPct}%`,
                                            width: `${widthPct}%`,
                                            background: COMPOUND_COLORS[stint.visual_compound],
                                            color: stint.visual_compound === 18 ? '#000' : '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 12px',
                                            borderRight: '1.5px solid rgba(0,0,0,0.15)',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace' }}>{COMPOUND_LABELS[stint.visual_compound]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* X-Axis Footer - EXACT SAME GRID ALIGNMENT */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', width: '100%', marginTop: '24px' }}>
                <div />
                <div style={{ position: 'relative', width: '100%', height: '32px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {ticks.map((t, i) => (
                        <div 
                            key={i} 
                            style={{ 
                                position: 'absolute', 
                                left: `${t.pct}%`, 
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingTop: '8px'
                            }}
                        >
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#626266', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                LAP {t.lap}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
