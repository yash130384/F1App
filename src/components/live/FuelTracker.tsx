'use client';

import React from 'react';

interface FuelTrackerProps {
    fuelMix: number;             // 0=lean, 1=standard, 2=rich, 3=max (F1 25 usually just standard)
    fuelRemainingLaps: number;   // Laps of fuel left
    currentLapNum: number;
    totalLaps: number;
}

export function FuelTracker({ fuelMix, fuelRemainingLaps, currentLapNum, totalLaps }: FuelTrackerProps) {
    const lapsLeft = totalLaps - currentLapNum;
    const delta = fuelRemainingLaps - lapsLeft;
    const isCrisis = delta < -0.5;
    const isWarning = delta < 0.2;

    const mixLabels = ['LEAN', 'STD', 'RICH', 'MAX'];
    const mixColors = ['#60a5fa', '#22c55e', '#facc15', '#ef4444'];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Fuel Management
                </span>
                <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    background: `${mixColors[fuelMix] || '#888'}22`,
                    color: mixColors[fuelMix] || '#888',
                    border: `1px solid ${mixColors[fuelMix] || '#888'}44`,
                }}>
                    {mixLabels[fuelMix] || '---'}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>REMAINING LAPS</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {fuelRemainingLaps.toFixed(2)}
                    </div>
                </div>

                <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>DELTA TO END</div>
                    <div style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: isCrisis ? '#ef4444' : isWarning ? '#facc15' : '#22c55e',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Visual indicator bar */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    height: '100%',
                    width: '2px',
                    background: 'rgba(255,255,255,0.2)',
                    zIndex: 2,
                }} />
                <div style={{
                    position: 'absolute',
                    left: delta < 0 ? `calc(50% - ${Math.min(50, Math.abs(delta) * 10)}%)` : '50%',
                    width: `${Math.min(50, Math.abs(delta) * 10)}%`,
                    height: '100%',
                    background: delta < 0 ? '#ef4444' : '#22c55e',
                    transition: 'all 0.5s ease',
                }} />
            </div>

            {(isCrisis || isWarning) && (
                <div style={{
                    fontSize: 10,
                    color: isCrisis ? '#ef4444' : '#facc15',
                    textAlign: 'center',
                    fontWeight: 700,
                    padding: '4px',
                    background: isCrisis ? 'rgba(239,68,68,0.1)' : 'rgba(250,204,21,0.1)',
                    borderRadius: 6,
                    animation: isCrisis ? 'pulse 1s infinite' : 'none',
                }}>
                    {isCrisis ? '🚨 CRITICAL: LIFT & COAST REQUIRED' : '⚠️ WARNING: LOW FUEL DELTA'}
                </div>
            )}
        </div>
    );
}
