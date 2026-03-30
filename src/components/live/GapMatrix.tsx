'use client';

import React from 'react';

interface GapPlayer {
    gameName: string;
    position: number;
    deltaToCarInFrontMs: number;
    deltaToRaceLeaderMs: number;
    lastLapTimeInMS: number;
    sector1Ms?: number;
    sector2Ms?: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    penaltiesTime: number;
    isHuman: boolean;
    pitStatus: number;
    driverStatus?: number;
    resultStatus?: number;
    pitLaneTimerActive?: number;
    pitStopTimerInMS?: number;
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

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'GARAGE', color: '#666', bg: 'rgba(102,102,102,0.1)' },
    1: { label: 'FLYING', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    2: { label: 'IN LAP', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    3: { label: 'OUT LAP', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    4: { label: 'TRACK', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

const RESULT_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    3: { label: 'FIN', color: '#22c55e', bg: 'rgba(34,197,94,0.2)' },
    4: { label: 'DNF', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
    5: { label: 'DSQ', color: '#991b1b', bg: 'rgba(153,27,27,0.2)' },
    7: { label: 'RET', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
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

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                    <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '8px 4px' }}>POS</th>
                        <th style={{ padding: '8px 4px' }}>DRIVER</th>
                        <th style={{ padding: '8px 4px' }}>STATUS</th>
                        <th style={{ padding: '8px 4px' }}>DELTA FRONT</th>
                        <th style={{ padding: '8px 4px' }}>DELTA LEAD</th>
                        <th style={{ padding: '8px 4px' }}>S1</th>
                        <th style={{ padding: '8px 4px' }}>S2</th>
                        <th style={{ padding: '8px 4px' }}>LAST LAP</th>
                        <th style={{ padding: '8px 4px' }}>TYRE (AGE)</th>
                        <th style={{ padding: '8px 4px' }}>PEN</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((p, i) => {
                        const isSelected = p.gameName === selectedDriver;
                        const status = (p.resultStatus && p.resultStatus > 2) 
                            ? RESULT_CONFIG[p.resultStatus] 
                            : (p.pitStatus > 0 ? { label: 'PIT', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' } : STATUS_CONFIG[p.driverStatus || 0]);

                        return (
                            <tr key={p.gameName} style={{
                                background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                color: isSelected ? '#fff' : '#aaa',
                                transition: 'background 0.2s',
                            }}>
                                <td style={{ padding: '8px 4px', fontWeight: 700 }}>{p.position}</td>
                                <td style={{ padding: '8px 4px', fontWeight: isSelected ? 800 : 500, whiteSpace: 'nowrap' }}>
                                    {p.gameName} {p.isHuman ? '👤' : ''}
                                </td>
                                <td style={{ padding: '8px 4px' }}>
                                    {status && (
                                        <span style={{
                                            fontSize: 8,
                                            fontWeight: 900,
                                            padding: '1px 4px',
                                            borderRadius: 3,
                                            background: status.bg,
                                            color: status.color,
                                            border: `1px solid ${status.color}33`,
                                        }}>
                                            {status.label}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatGap(p.deltaToCarInFrontMs)}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatGap(p.deltaToRaceLeaderMs)}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums', color: p.sector1Ms ? '#fff' : '#444' }}>
                                    {p.sector1Ms ? (p.sector1Ms / 1000).toFixed(3) : '--.---'}
                                </td>
                                <td style={{ padding: '8px 4px', fontVariantNumeric: 'tabular-nums', color: p.sector2Ms ? '#fff' : '#444' }}>
                                    {p.sector2Ms ? (p.sector2Ms / 1000).toFixed(3) : '--.---'}
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
