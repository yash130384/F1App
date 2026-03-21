'use client';

import React from 'react';

interface BrakeWidgetProps {
    brakesTemperature: number[];  // [RL, RR, FL, FR] °C
    brakesDamage: number[];       // [RL, RR, FL, FR] % (0-100)
}

const BRAKE_LABELS = ['FL', 'FR', 'RL', 'RR'];
// Map indices to match F1 data order [RL, RR, FL, FR] → display as FL, FR, RL, RR
const DISPLAY_ORDER = [2, 3, 0, 1];

function tempBrakeColor(temp: number): string {
    if (temp < 200) return '#3b82f6';
    if (temp < 400) return '#22c55e';
    if (temp < 600) return '#eab308';
    if (temp < 800) return '#f97316';
    return '#ef4444';
}

function SingleBrake({ label, temp, damage }: { label: string; temp: number; damage: number }) {
    const color = tempBrakeColor(temp);
    const damagePct = Math.min(100, Math.max(0, damage));

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${damagePct > 50 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10,
            padding: '0.6rem 0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            boxShadow: damagePct > 50 ? '0 0 10px rgba(239,68,68,0.25)' : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1 }}>{label}</span>
                {damagePct > 30 && (
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>⚠ {damagePct}%</span>
                )}
            </div>

            {/* Temperature disc visualization */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}55, ${color}22)`,
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 10px ${color}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    color,
                    fontWeight: 700,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                }}>
                    🔥
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(temp)}°C
                    </span>
                    <span style={{ fontSize: 9, color: damagePct > 50 ? '#ef4444' : '#666' }}>
                        {damagePct}% damage
                    </span>
                </div>
            </div>

            {/* Damage bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                <div style={{
                    height: '100%',
                    width: `${damagePct}%`,
                    background: damagePct > 50 ? '#ef4444' : damagePct > 25 ? '#f97316' : '#22c55e',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
}

export function BrakeWidget({ brakesTemperature, brakesDamage }: BrakeWidgetProps) {
    const maxTemp = Math.max(...brakesTemperature);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Brakes
                </span>
                <span style={{
                    fontSize: 11,
                    color: tempBrakeColor(maxTemp),
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    Max {Math.round(maxTemp)}°C
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
            }}>
                {DISPLAY_ORDER.map((dataIdx, i) => (
                    <SingleBrake
                        key={BRAKE_LABELS[i]}
                        label={BRAKE_LABELS[i]}
                        temp={brakesTemperature[dataIdx]}
                        damage={brakesDamage[dataIdx]}
                    />
                ))}
            </div>
        </div>
    );
}
