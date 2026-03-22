'use client';

import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface LapEntry {
    participant_id: string;
    lap_number: number;
    lap_time_ms: number;
    is_valid: boolean;
    driver_name?: string;
    game_name: string;
    driver_color?: string;
}

interface RacePaceChartProps {
    laps: LapEntry[];
}

export default function RacePaceChart({ laps }: RacePaceChartProps) {

    // Group by lap
    const dataByLap: Record<number, any> = {};
    const drivers = new Map<string, { name: string, color: string }>();

    laps.forEach(l => {
        // Skip lap 0 (usually partial or out lap)
        if (l.lap_number === 0) return;

        if (!dataByLap[l.lap_number]) dataByLap[l.lap_number] = { lap: l.lap_number };
        
        const name = l.driver_name || l.game_name;
        drivers.set(name, { name, color: l.driver_color || '#888' });
        
        let time: number | null = l.lap_time_ms / 1000;
        
        // Basic outlier filter (e.g. pit stops or crashes)
        // If > 180s, it's likely not representative for "pace" comparison
        if (time > 180 || !l.is_valid) {
            time = null; // Don't show in chart
        }

        dataByLap[l.lap_number][name] = time? parseFloat(time.toFixed(3)) : null;
    });

    const chartData = Object.values(dataByLap).sort((a, b) => a.lap - b.lap);
    const sortedDrivers = Array.from(drivers.values()).sort((a,b) => a.name.localeCompare(b.name));

    const formatTime = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
    };

    return (
        <div className="p-6 f1-card" style={{ height: 500 }}>
            <div className="flex flex-col justify-start items-start mb-6">
                <h3 className="text-white font-bold text-lg">Race Pace Comparison</h3>
                <p className="text-slate-500 text-xs uppercase font-bold">Rundenzeiten im Vergleich (Sekunden)</p>
            </div>

            <ResponsiveContainer width="100%" height="80%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="lap" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        label={{ value: 'RUNDE', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: '#666' }}
                    />
                    <YAxis 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        domain={['auto', 'auto']}
                        tickFormatter={formatTime}
                        label={{ value: 'TIME', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#666' }}
                    />
                    <Tooltip 
                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(v: any) => [formatTime(v), 'Zeit']}
                        labelFormatter={(l) => `Runde ${l}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 15 }} />
                    {sortedDrivers.map(d => (
                        <Line
                            key={d.name}
                            type="monotone"
                            dataKey={d.name}
                            stroke={d.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                            connectNulls={true}
                            isAnimationActive={true}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
