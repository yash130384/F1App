'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';

interface TelemetryPoint {
    time: number;
    brakeTemps: number[]; // [FL, FR, RL, RR]
}

interface Props {
    history: TelemetryPoint[];
}

export function LiveBrakeGraph({ history }: Props) {
    const data = history.map(h => ({
        time: h.time,
        FL: h.brakeTemps[0],
        FR: h.brakeTemps[1],
        RL: h.brakeTemps[2],
        RR: h.brakeTemps[3],
    }));

    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            height: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Brake Temps (°C)
                </span>
            </div>

            <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip 
                            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
                            itemStyle={{ padding: '0 4px' }}
                        />
                        <Line type="monotone" dataKey="FL" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line type="monotone" dataKey="FR" stroke="#60a5fa" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line type="monotone" dataKey="RL" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                        <Line type="monotone" dataKey="RR" stroke="#f87171" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 10, fontWeight: 600 }}>
                <span style={{ color: '#3b82f6' }}>FL</span>
                <span style={{ color: '#60a5fa' }}>FR</span>
                <span style={{ color: '#ef4444' }}>RL</span>
                <span style={{ color: '#f87171' }}>RR</span>
            </div>
        </div>
    );
}
