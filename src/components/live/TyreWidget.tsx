'use client';

import React from 'react';

interface TyreWidgetProps {
    surfaceTemp: number[];      // [RL, RR, FL, FR] °C
    innerTemp: number[];        // [RL, RR, FL, FR] °C
    pressure: number[];         // [RL, RR, FL, FR] psi
    tyreWear: number[];         // [RL, RR, FL, FR] % (float 0-1)
    tyreDamage: number[];       // [RL, RR, FL, FR] % (uint8)
    tyreBlisters: number[];     // [RL, RR, FL, FR] (0=none, >0=blistering)
    visualCompound: number;     // 16=Soft, 17=Medium, 18=Hard, 7=Inter, 8=Wet
    tyresAgeLaps: number;
}

const COMPOUND_CONFIG: Record<number, { label: string; color: string }> = {
    16: { label: 'SOFT', color: '#ef4444' },
    17: { label: 'MED',  color: '#eab308' },
    18: { label: 'HARD', color: '#e5e7eb' },
    7:  { label: 'INTER', color: '#22c55e' },
    8:  { label: 'WET',  color: '#3b82f6' },
};

const LABELS = ['RL', 'RR', 'FL', 'FR'];
// Layout positions: [row, col] — Rear Left, Rear Right, Front Left, Front Right
const POSITIONS = [
    { row: 1, col: 0 }, // RL
    { row: 1, col: 1 }, // RR
    { row: 0, col: 0 }, // FL
    { row: 0, col: 1 }, // FR
];

function tempToColor(temp: number): string {
    // Cold: blue → optimal: green → hot: yellow → overheating: red
    if (temp < 70) return '#3b82f6';
    if (temp < 90) return '#22c55e';
    if (temp < 110) return '#eab308';
    return '#ef4444';
}

function SingleTyre({
    label,
    surfaceTemp,
    innerTemp,
    pressure,
    wear,
    damage,
    blisters,
}: {
    label: string;
    surfaceTemp: number;
    innerTemp: number;
    pressure: number;
    wear: number;
    damage: number;
    blisters: number;
}) {
    const wearPct = Math.min(100, Math.max(0, wear * 100));
    const color = tempToColor(surfaceTemp);
    const hasBlisters = blisters > 0;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${hasBlisters ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10,
            padding: '0.6rem 0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            minWidth: 110,
            boxShadow: hasBlisters ? '0 0 12px rgba(249,115,22,0.3)' : 'none',
        }}>
            {/* Label + Blister Warning */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1 }}>{label}</span>
                {hasBlisters && (
                    <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#f97316',
                        background: 'rgba(249,115,22,0.15)',
                        padding: '1px 5px',
                        borderRadius: 4,
                        animation: 'pulse 1s infinite',
                    }}>
                        🫧 BLISTER
                    </span>
                )}
            </div>

            {/* Tyre visual + wear bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Tyre icon with temp color */}
                <div style={{
                    width: 28,
                    height: 44,
                    borderRadius: 6,
                    background: `linear-gradient(to bottom, ${color}44, ${color}22)`,
                    border: `2px solid ${color}`,
                    position: 'relative',
                    boxShadow: `0 0 8px ${color}55`,
                }}>
                    {/* Wear overlay */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${100 - wearPct}%`,
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '0 0 4px 4px',
                        transition: 'height 0.3s ease',
                    }} />
                </div>

                {/* Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
                    <div style={{ color: color, fontWeight: 700 }}>{surfaceTemp}°C <span style={{ color: '#666', fontWeight: 400 }}>surf</span></div>
                    <div style={{ color: '#aaa' }}>{innerTemp}°C <span style={{ color: '#555' }}>inner</span></div>
                    <div style={{ color: '#aaa' }}>{pressure.toFixed(1)} psi</div>
                    <div style={{ color: wearPct > 70 ? '#ef4444' : wearPct > 40 ? '#eab308' : '#22c55e' }}>
                        {Math.round(wearPct)}% <span style={{ color: '#555' }}>worn</span>
                    </div>
                </div>
            </div>

            {/* Wear progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <div style={{
                    height: '100%',
                    width: `${wearPct}%`,
                    background: wearPct > 70 ? '#ef4444' : wearPct > 40 ? '#eab308' : '#22c55e',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
}

export function TyreWidget({
    surfaceTemp, innerTemp, pressure, tyreWear, tyreDamage, tyreBlisters, visualCompound, tyresAgeLaps
}: TyreWidgetProps) {
    const compound = COMPOUND_CONFIG[visualCompound] ?? { label: 'UNK', color: '#888' };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Tyres
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                        padding: '2px 10px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: `${compound.color}22`,
                        color: compound.color,
                        border: `1px solid ${compound.color}44`,
                        letterSpacing: 1,
                    }}>
                        {compound.label}
                    </span>
                    <span style={{ fontSize: 10, color: '#666' }}>Lap {tyresAgeLaps}</span>
                </div>
            </div>

            {/* 2×2 grid: FL, FR top; RL, RR bottom */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: 'auto auto',
                gap: 8,
            }}>
                {/* Front row */}
                <SingleTyre label="FL" surfaceTemp={surfaceTemp[2]} innerTemp={innerTemp[2]} pressure={pressure[2]}
                    wear={tyreWear[2]} damage={tyreDamage[2]} blisters={tyreBlisters[2]} />
                <SingleTyre label="FR" surfaceTemp={surfaceTemp[3]} innerTemp={innerTemp[3]} pressure={pressure[3]}
                    wear={tyreWear[3]} damage={tyreDamage[3]} blisters={tyreBlisters[3]} />
                {/* Rear row */}
                <SingleTyre label="RL" surfaceTemp={surfaceTemp[0]} innerTemp={innerTemp[0]} pressure={pressure[0]}
                    wear={tyreWear[0]} damage={tyreDamage[0]} blisters={tyreBlisters[0]} />
                <SingleTyre label="RR" surfaceTemp={surfaceTemp[1]} innerTemp={innerTemp[1]} pressure={pressure[1]}
                    wear={tyreWear[1]} damage={tyreDamage[1]} blisters={tyreBlisters[1]} />
            </div>
        </div>
    );
}
