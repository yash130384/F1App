'use client';

import React, { useEffect, useRef } from 'react';

interface Incident {
    timestamp: number;
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    details: string;
    vehicleIdx?: number;
    otherVehicleIdx?: number;
    lapNum?: number;
}

interface IncidentLogProps {
    incidents: Incident[];
    trackFlags: number; // 0=none, 1=green, 2=blue, 3=yellow
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    PENALTY: { label: 'PENALTY', color: '#ef4444', icon: '⚖️' },
    COLLISION: { label: 'COLLISION', color: '#f87171', icon: '💥' },
    OVERTAKE: { label: 'OVERTAKE', color: '#60a5fa', icon: '🏎💨' },
    RETIREMENT: { label: 'RETIRED', color: '#991b1b', icon: '🏁' },
    SAFETY_CAR: { label: 'STATUS', color: '#fbbf24', icon: '🚔' },
};

const FLAG_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: 'GREEN FLAG', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    2: { label: 'BLUE FLAG', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    3: { label: 'YELLOW FLAG', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    4: { label: 'RED FLAG', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export function IncidentLog({ incidents, trackFlags }: IncidentLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0; // Newest at top
        }
    }, [incidents]);

    const activeFlag = FLAG_CONFIG[trackFlags];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: 400,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    Real-time Incident Log
                </span>
                {activeFlag && (
                    <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: activeFlag.color,
                        background: activeFlag.bg,
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: `1px solid ${activeFlag.color}33`,
                    }}>
                        {activeFlag.label}
                    </span>
                )}
            </div>

            <div 
                ref={scrollRef}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                }}
            >
                {incidents.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#444', textAlign: 'center', padding: '20px 0' }}>
                        No incidents reported
                    </div>
                ) : incidents.slice().reverse().map((inc, i) => {
                    const cfg = TYPE_CONFIG[inc.type] || { label: 'EVENT', color: '#fff', icon: 'ℹ️' };
                    const time = new Date(inc.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                        <div key={i} style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${cfg.color}22`,
                            borderLeft: `3px solid ${cfg.color}`,
                            padding: '8px 12px',
                            borderRadius: 6,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: 1 }}>
                                    {cfg.icon} {cfg.label}
                                </span>
                                <span style={{ fontSize: 9, color: '#555' }}>
                                    {inc.lapNum ? `LAP ${inc.lapNum} • ` : ''}{time}
                                </span>
                            </div>
                            <div style={{ fontSize: 13, color: '#eee', fontWeight: 500 }}>
                                {inc.details}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
