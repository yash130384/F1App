'use client';

import React from 'react';

interface Lap {
    lapNumber: number;
    lapTimeMs: number;
    isValid: boolean;
    sector1Ms?: number;
    sector2Ms?: number;
    sector3Ms?: number;
    tyreCompound?: number;
}

interface SelectedDriverHistoryProps {
    laps: Lap[];
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

export function SelectedDriverHistory({ laps }: SelectedDriverHistoryProps) {
    const displayLaps = [...laps].reverse().slice(0, 10);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
        }}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                Recent Lap History
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                    <tr style={{ color: '#666', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '8px 4px' }}>LAP</th>
                        <th style={{ padding: '8px 4px' }}>S1</th>
                        <th style={{ padding: '8px 4px' }}>S2</th>
                        <th style={{ padding: '8px 4px' }}>S3</th>
                        <th style={{ padding: '8px 4px' }}>TIME</th>
                        <th style={{ padding: '8px 4px' }}>TYRE</th>
                    </tr>
                </thead>
                <tbody>
                    {displayLaps.length === 0 ? (
                        <tr>
                            <td colSpan={6} style={{ padding: '24px 0', textAlign: 'center', color: '#444' }}>
                                No completed laps yet
                            </td>
                        </tr>
                    ) : displayLaps.map((lap, i) => (
                        <tr key={lap.lapNumber} style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            color: lap.isValid ? '#eee' : '#ef4444'
                        }}>
                            <td style={{ padding: '8px 4px', fontWeight: 600 }}>{lap.lapNumber}</td>
                            <td style={{ padding: '8px 4px' }}>{lap.sector1Ms ? (lap.sector1Ms / 1000).toFixed(3) : '---'}</td>
                            <td style={{ padding: '8px 4px' }}>{lap.sector2Ms ? (lap.sector2Ms / 1000).toFixed(3) : '---'}</td>
                            <td style={{ padding: '8px 4px' }}>{lap.sector3Ms ? (lap.sector3Ms / 1000).toFixed(3) : '---'}</td>
                            <td style={{ padding: '8px 4px', fontWeight: 700 }}>{formatLapTime(lap.lapTimeMs)}</td>
                            <td style={{ padding: '8px 4px' }}>
                                {lap.tyreCompound && (
                                    <span style={{
                                        fontSize: 9,
                                        fontWeight: 900,
                                        color: COMPOUND_COLORS[lap.tyreCompound] || '#888'
                                    }}>
                                        {COMPOUND_LABELS[lap.tyreCompound] || '?'}
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
