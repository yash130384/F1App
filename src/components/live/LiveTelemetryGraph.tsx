'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

interface TelemetryPoint {
    time: number;
    throttle: number;
    brake: number;
    steer: number;
    ers: number;
    drs: number;
    gear: number;
}

interface Props {
    history: TelemetryPoint[];
}

export function LiveTelemetryGraph({ history }: Props) {
    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            height: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Multi-Channel Telemetry Trace
                </span>
                <div style={{ display: 'flex', gap: 10, fontSize: 9, fontWeight: 700, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ color: '#22c55e' }}>● THR</span>
                    <span style={{ color: '#ef4444' }}>● BRK</span>
                    <span style={{ color: '#3b82f6' }}>● STR</span>
                    <span style={{ color: '#eab308' }}>● ERS</span>
                    <span style={{ color: '#a855f7' }}>● DRS</span>
                    <span style={{ color: '#fff' }}>● GEAR</span>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorThrottle" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorBrake" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorErs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis yAxisId="inputs" domain={[0, 1]} hide />
                        <YAxis yAxisId="gears" domain={[0, 8]} hide />
                        
                        <Area
                            yAxisId="inputs"
                            type="monotone"
                            dataKey="ers"
                            stroke="#eab308"
                            fillOpacity={1}
                            fill="url(#colorErs)"
                            isAnimationActive={false}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                        />
                        <Area
                            yAxisId="inputs"
                            type="monotone"
                            dataKey="throttle"
                            stroke="#22c55e"
                            fillOpacity={1}
                            fill="url(#colorThrottle)"
                            isAnimationActive={false}
                            strokeWidth={2}
                        />
                        <Area
                            yAxisId="inputs"
                            type="monotone"
                            dataKey="brake"
                            stroke="#ef4444"
                            fillOpacity={1}
                            fill="url(#colorBrake)"
                            isAnimationActive={false}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <YAxis yAxisId="steer" domain={[-1, 1]} hide />
                            <YAxis yAxisId="gears" domain={[0, 8]} hide />
                            
                            {/* Refs */}
                            <path d="M 0 50% L 100% 50%" stroke="rgba(255,255,255,0.1)" strokeDasharray="5 5" style={{ transform: 'translateY(50%)' }} />
                            
                            <Line
                                yAxisId="steer"
                                type="monotone"
                                dataKey="steer"
                                stroke="#3b82f6"
                                dot={false}
                                isAnimationActive={false}
                                strokeWidth={2.5}
                            />
                            <Line
                                yAxisId="gears"
                                type="stepAfter"
                                dataKey="gear"
                                stroke="#fff"
                                dot={false}
                                isAnimationActive={false}
                                strokeWidth={2}
                                strokeOpacity={0.8}
                            />
                            <Line
                                yAxisId="inputs"
                                type="stepAfter"
                                dataKey="drs"
                                stroke="#a855f7"
                                dot={false}
                                isAnimationActive={false}
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
