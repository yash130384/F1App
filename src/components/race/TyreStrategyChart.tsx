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

function TyreBadge({ compoundId, size = '16px' }: { compoundId: number, size?: string }) {
    const label = COMPOUND_LABELS[compoundId] || '?';
    const color = COMPOUND_COLORS[compoundId] || '#555';
    const textColor = compoundId === 18 ? '#000' : '#fff';

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: size, height: size, borderRadius: '50%',
            background: color, color: textColor,
            fontWeight: 900, fontSize: '0.6rem',
            border: '1px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
            lineHeight: 1
        }}>
            {label}
        </span>
    );
}

export function TyreStrategyChart({ participants, totalLaps }: TyreStrategyChartProps) {
    const sortedParticipants = React.useMemo(() => {
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

    const effectiveMaxLaps = React.useMemo(() => {
        let max = 0;
        sortedParticipants.forEach(p => {
            p.mergedStints.forEach(s => {
                if (s.end_lap && s.end_lap > max) max = s.end_lap;
            });
        });
        return max || totalLaps;
    }, [sortedParticipants, totalLaps]);

    return (
        <div className="flex flex-col gap-small w-full">
            {sortedParticipants.map((p) => (
                <div key={p.game_name} className="flex items-center gap-medium group">
                    {/* Identity Section (Fixed Width) */}
                    <div className="flex items-center gap-small" style={{ width: '220px', flexShrink: 0 }}>
                        <span className="text-mono" style={{ color: 'var(--f1-red)', fontWeight: 900, fontSize: '0.8rem', width: '30px' }}>
                            P{p.position}
                        </span>
                        <span className="text-f1-bold italic truncate" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                            {p.driver_name?.toUpperCase() || p.game_name.toUpperCase()}
                        </span>
                    </div>

                    {/* Timeline Section (Flexible) */}
                    <div className="relative flex-1 h-8 bg-surface-lower overflow-hidden flex items-center" 
                         style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                        {p.mergedStints.map((stint, idx) => {
                            const start = stint.start_lap;
                            const end = stint.end_lap || effectiveMaxLaps;
                            const duration = end - start + 1;
                            const left = ((start - 1) / effectiveMaxLaps) * 100;
                            const width = (duration / effectiveMaxLaps) * 100;

                            return (
                                <div 
                                    key={idx}
                                    className="absolute h-full flex items-center px-1"
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        background: `linear-gradient(to right, ${COMPOUND_COLORS[stint.visual_compound]}44, ${COMPOUND_COLORS[stint.visual_compound]}11)`,
                                        borderLeft: idx > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                                    }}
                                >
                                    <div className="flex items-center gap-xsmall">
                                        <TyreBadge compoundId={stint.visual_compound} />
                                        {width > 8 && (
                                            <span className="text-mono" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                                L{duration}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
