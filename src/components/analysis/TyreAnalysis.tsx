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
    Legend,
    AreaChart,
    Area
} from 'recharts';

interface Sample {
    d: number;
    tSurf: number[]; // [FL, FR, RL, RR]
    tInner: number[]; // [FL, FR, RL, RR]
}

interface TyreAnalysisProps {
    samples: Sample[];
    driverName: string;
}

const TYRE_LABELS = ['VL', 'VR', 'HL', 'HR'];
const TYRE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

export default function TyreAnalysis({ samples, driverName }: TyreAnalysisProps) {
    const chartData = useMemo(() => {
        return samples.map(s => ({
            dist: Math.round(s.d),
            fl_surf: s.tSurf[0],
            fr_surf: s.tSurf[1],
            rl_surf: s.tSurf[2],
            rr_surf: s.tSurf[3],
            fl_inner: s.tInner[0],
            fr_inner: s.tInner[1],
            rl_inner: s.tInner[2],
            rr_inner: s.tInner[3],
        }));
    }, [samples]);

    return (
        <div className="flex flex-col gap-8 w-full animate-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {TYRE_LABELS.map((label, idx) => {
                    const keyBase = label.toLowerCase().replace('v', 'f').replace('h', 'r');
                    const surfKey = `${keyBase}_surf`;
                    const innerKey = `${keyBase}_inner`;

                    return (
                        <div key={label} className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-xl transition-all hover:border-white/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-white font-bold text-lg flex items-center gap-3">
                                    <div className="w-1.5 h-6 rounded-full bg-f1-red" style={{ backgroundColor: TYRE_COLORS[idx] }}></div>
                                    Reifen {label}
                                </h3>
                                <div className="text-slate-400 text-sm font-medium">Thermische Analyse</div>
                            </div>
                            
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id={`gradSurf-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={TYRE_COLORS[idx]} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={TYRE_COLORS[idx]} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis dataKey="dist" hide />
                                        <YAxis stroke="#475569" fontSize={11} domain={[70, 120]} tickFormatter={(val) => `${val}°C`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                        />
                                        <Legend verticalAlign="top" height={36} />
                                        <Area 
                                            name="Oberfläche" 
                                            type="monotone" 
                                            dataKey={surfKey} 
                                            stroke={TYRE_COLORS[idx]} 
                                            fillOpacity={1} 
                                            fill={`url(#gradSurf-${idx})`} 
                                            strokeWidth={2}
                                        />
                                        <Line 
                                            name="Kern" 
                                            type="monotone" 
                                            dataKey={innerKey} 
                                            stroke="#94a3b8" 
                                            strokeWidth={2} 
                                            dot={false}
                                            strokeDasharray="4 4"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Summary / Temperature Spread */}
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10">
                <h3 className="text-white font-bold mb-6 text-xl">Temperatur-Gefälle (Surface vs. Core)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {TYRE_LABELS.map((label, idx) => {
                        const lastSample = samples[samples.length - 1];
                        const diff = lastSample.tSurf[idx] - lastSample.tInner[idx];
                        return (
                            <div key={label} className="text-center p-4 bg-white/5 rounded-xl">
                                <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">{label} Delta</div>
                                <div className={`text-2xl font-black ${diff > 10 ? 'text-red-400' : 'text-blue-400'}`}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}°C
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
