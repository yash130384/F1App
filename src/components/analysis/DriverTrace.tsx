'use client';

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface Sample {
    d: number; // distance
    s: number; // speed
    t: number; // throttle
    b: number; // brake
    st: number; // steer
}

interface DriverTraceProps {
    data1: Sample[];
    data2: Sample[];
    label1: string;
    label2: string;
    color1: string;
    color2: string;
}

export default function DriverTrace({ data1, data2, label1, label2, color1, color2 }: DriverTraceProps) {
    // Merge data for Recharts (plotting against distance)
    const mergedData = useMemo(() => {
        // Simple approach: use data1 as base distance points and interpolate data2
        // For a more precise version, we'd create a unified distance axis
        return data1.map(s1 => {
            // Find closest sample in data2 for comparison
            const s2 = data2.reduce((prev, curr) => 
                Math.abs(curr.d - s1.d) < Math.abs(prev.d - s1.d) ? curr : prev
            );

            return {
                dist: Math.round(s1.d),
                [`speed_${label1}`]: s1.s,
                [`speed_${label2}`]: s2.s,
                [`throttle_${label1}`]: s1.t * 100,
                [`throttle_${label2}`]: s2.t * 100,
                [`brake_${label1}`]: s1.b * 100,
                [`brake_${label2}`]: s2.b * 100,
                [`steer_${label1}`]: s1.st * 100,
                [`steer_${label2}`]: s2.st * 100,
                delta: s1.s - s2.s
            };
        });
    }, [data1, data2, label1, label2]);

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
            {/* Speed Chart */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Geschwindigkeit (km/h)
                </h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                                dataKey="dist" 
                                stroke="#94a3b8" 
                                fontSize={12} 
                                tickFormatter={(val) => `${val}m`}
                            />
                            <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line 
                                name={label1} 
                                type="monotone" 
                                dataKey={`speed_${label1}`} 
                                stroke={color1} 
                                strokeWidth={2} 
                                dot={false} 
                                animationDuration={1000}
                            />
                            <Line 
                                name={label2} 
                                type="monotone" 
                                dataKey={`speed_${label2}`} 
                                stroke={color2} 
                                strokeWidth={2} 
                                dot={false}
                                strokeDasharray="5 5"
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Throttle & Brake Chart */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Gas & Bremse (%)
                </h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="dist" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${val}m`} />
                            <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            />
                            <Line name={`${label1} Gas`} type="monotone" dataKey={`throttle_${label1}`} stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line name={`${label2} Gas`} type="monotone" dataKey={`throttle_${label2}`} stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                            <Line name={`${label1} Bremse`} type="monotone" dataKey={`brake_${label1}`} stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line name={`${label2} Bremse`} type="monotone" dataKey={`brake_${label2}`} stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Steering Chart */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Lenkung (%)
                </h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey="dist" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} domain={[-100, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                            <Line name={label1} type="monotone" dataKey={`steer_${label1}`} stroke={color1} strokeWidth={2} dot={false} />
                            <Line name={label2} type="monotone" dataKey={`steer_${label2}`} stroke={color2} strokeWidth={2} dot={false} strokeDasharray="3 3" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
