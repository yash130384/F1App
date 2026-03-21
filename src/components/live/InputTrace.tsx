'use client';

import React from 'react';

interface InputTraceProps {
    throttle: number;      // 0.0–1.0
    brake: number;         // 0.0–1.0
    steer: number;         // -1.0 (links) bis 1.0 (rechts)
    clutch: number;        // 0.0–1.0
    gear: number;
    engineRPM: number;
    drs: number;           // 0=off, 1=on
    ersDeployMode: number; // 0=None, 1=Medium, 2=Hotlap, 3=Overtake
    speedKmh: number;
}

const ERS_CONFIG = [
    { label: 'NONE',     color: '#555',  bg: 'rgba(85,85,85,0.2)' },
    { label: 'MEDIUM',   color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
    { label: 'HOTLAP',   color: '#f97316', bg: 'rgba(249,115,22,0.2)' },
    { label: 'OVERTAKE', color: '#ef4444', bg: 'rgba(239,68,68,0.2)' },
];

function PedalBar({ value, label, color, vertical = true }: { value: number; label: string; color: string; vertical?: boolean }) {
    const pct = Math.min(1, Math.max(0, value)) * 100;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
            <div style={{
                width: 28,
                height: 100,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${pct}%`,
                    background: color,
                    borderRadius: '0 0 6px 6px',
                    transition: 'height 0.05s ease',
                    boxShadow: `0 0 8px ${color}88`,
                }} />
            </div>
            <span style={{ fontSize: 10, color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</span>
        </div>
    );
}

function SteeringArc({ value }: { value: number }) {
    // value: -1 (left) to +1 (right)
    const clamped = Math.min(1, Math.max(-1, value));
    const angle = clamped * 180; // ±180°
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Steer</span>
            <div style={{ position: 'relative', width: 80, height: 44 }}>
                <svg width="80" height="44" viewBox="0 0 80 44">
                    {/* Background arc */}
                    <path
                        d="M 5 42 A 35 35 0 0 1 75 42"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                    {/* Colored arc segment */}
                    <path
                        d="M 5 42 A 35 35 0 0 1 75 42"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                    {/* Center line */}
                    <line x1="40" y1="8" x2="40" y2="42"
                        stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Needle */}
                    <line
                        x1="40" y1="42"
                        x2={40 + Math.sin((angle * Math.PI) / 180) * 32}
                        y2={42 - Math.cos(((90 + angle) * Math.PI) / 180) * 32 - 10}
                        stroke={clamped < -0.1 ? '#3b82f6' : clamped > 0.1 ? '#ef4444' : '#22c55e'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ transition: 'all 0.05s ease' }}
                    />
                    {/* Center dot */}
                    <circle cx="40" cy="42" r="4"
                        fill={clamped < -0.1 ? '#3b82f6' : clamped > 0.1 ? '#ef4444' : '#22c55e'}
                        style={{ transition: 'fill 0.1s' }} />
                </svg>
            </div>
            <span style={{ fontSize: 10, color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>
                {clamped < 0 ? `${Math.abs(Math.round(clamped * 100))}% L` : clamped > 0 ? `${Math.round(clamped * 100)}% R` : 'CTR'}
            </span>
        </div>
    );
}

export function InputTrace({
    throttle, brake, steer, clutch, gear, engineRPM, drs, ersDeployMode, speedKmh
}: InputTraceProps) {
    const ers = ERS_CONFIG[Math.min(3, Math.max(0, ersDeployMode))] ?? ERS_CONFIG[0];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Driver Inputs
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* DRS Badge */}
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: drs ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        color: drs ? '#22c55e' : '#555',
                        border: `1px solid ${drs ? '#22c55e44' : 'transparent'}`,
                        letterSpacing: 1,
                    }}>
                        DRS {drs ? 'ON' : 'OFF'}
                    </span>
                    {/* ERS Badge */}
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: ers.bg,
                        color: ers.color,
                        border: `1px solid ${ers.color}44`,
                        letterSpacing: 1,
                    }}>
                        ERS {ers.label}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', justifyContent: 'center' }}>
                {/* Pedal bars */}
                <PedalBar value={throttle} label="Throttle" color="#22c55e" />
                <PedalBar value={brake} label="Brake" color="#ef4444" />
                <PedalBar value={clutch / 100} label="Clutch" color="#a855f7" />

                {/* Spacer */}
                <div style={{ width: 1, height: 100, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />

                {/* Steering arc */}
                <SteeringArc value={steer} />

                {/* Spacer */}
                <div style={{ width: 1, height: 100, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />

                {/* Gear / Speed / RPM */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Gear</span>
                    <span style={{
                        fontSize: 40,
                        fontWeight: 900,
                        color: gear === 0 ? '#f97316' : '#fff',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                        textShadow: '0 0 20px rgba(255,255,255,0.3)',
                    }}>
                        {gear === 0 ? 'N' : gear === -1 ? 'R' : gear}
                    </span>
                    <span style={{ fontSize: 10, color: '#888' }}>{speedKmh} km/h</span>
                    <span style={{ fontSize: 9, color: '#666' }}>{engineRPM.toLocaleString()} RPM</span>
                </div>
            </div>
        </div>
    );
}
