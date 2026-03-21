'use client';

import React from 'react';

interface GapPlayer {
    gameName: string;
    position: number;
    deltaToCarInFrontMs: number;
    deltaToRaceLeaderMs: number;
    lastLapTimeInMS: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    penaltiesTime: number;
    isHuman: boolean;
}

interface GapMatrixProps {
    players: GapPlayer[];
    selectedDriver: string;
}

function formatGap(ms: number): string {
    if (ms === 0) return 'LEAD';
    if (ms > 60000) {
        const mins = Math.floor(ms / 60000);
        const secs = ((ms % 60000) / 1000).toFixed(3);
        return `+${mins}:${String(secs).padStart(6, '0')}`;
    }
    return `+${(ms / 1000).toFixed(3)}`;
}

function formatLapTime(ms: number): string {
    if (!ms || ms === 0) return '---';
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(3);
    return `${mins}:${String(secs).padStart(6, '0')}`;
}

const COMPOUND_COLORS: Record<number, string> = {
    16: '#ef4444', 17: '#eab308', 18: '#e5e7eb', 7: '#22c55e', 8: '#3b82f6'
};

const COMPOUND_LABELS: Record<number, string> = {
    16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W'
};

export function GapMatrix({ players, selectedDriver }: GapMatrixProps) {
    const sorted = [...players].sort((a, b) => a.position - b.position);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            overflowX: 'auto',
        }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 16 }}>
                Tactical Gap Matrix
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                    <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '8px 4px' }}>POS</th>
                        <th style={{ padding: '8px 4px' }}>DRIVER</th>
                        <th style={{ padding: '8px 4px' }}>DELTA FRONT</th>
                        <th style={{ padding: '8px 4px' }}>DELTA LEADER</th>
                        <th style={{ padding: '8px 4px' }}>LAST LAP</th>
                        <th style={{ padding: '8px 4px' }}>TYRE (AGE)</th>
                        <th style={{ padding: '8px 4px' }}>PEN</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((p, i) => {
                        const isSelected = p.gameName === selectedDriver;
                        return (
                            <tr key={p.gameName} style={{
                                background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                color: isSelected ? '#fff' : '#aaa',
                                transition: 'background 0.2s',
                            }}>
                                <td style={{ padding: '8px 4px', fontWeight: 700 }}>{p.position}</td>
                                <td style={{ padding: '8px 4px', fontWeight: isSelected ? 800 : 500 }}>
                                    {p.gameName} {p.isHuman ? '👤' : ''}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatGap(p.deltaToCarInFrontMs)}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatGap(p.deltaToRaceLeaderMs)}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatLapTime(p.lastLapTimeInMS)}
                                </td>
                                <td style={{ padding: '8px 4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            width: 14, height: 14, borderRadius: '50%',
                                            border: `2px solid ${COMPOUND_COLORS[p.visualTyreCompound] || '#888'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 7, fontWeight: 900, color: COMPOUND_COLORS[p.visualTyreCompound] || '#888'
                                        }}>
                                            {COMPOUND_LABELS[p.visualTyreCompound] || '?'}
                                        </span>
                                        <span>({p.tyresAgeLaps})</span>
                                    </div>
                                </td>
                                <td style={{ padding: '8px 4px', color: p.penaltiesTime > 0 ? '#ef4444' : 'inherit' }}>
                                    {p.penaltiesTime > 0 ? `+${p.penaltiesTime}s` : '--'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
