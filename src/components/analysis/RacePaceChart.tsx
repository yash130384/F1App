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
    const { chartData, drivers } = React.useMemo(() => {
        const dataByLap: Record<number, any> = {};
        const driversMap = new Map<string, { name: string, color: string }>();

        laps.forEach(l => {
            if (l.lap_number === 0) return;
            if (!dataByLap[l.lap_number]) dataByLap[l.lap_number] = { lap: l.lap_number };
            
            const name = l.driver_name || l.game_name;
            driversMap.set(name, { name, color: l.driver_color || 'var(--text-muted)' });
            
            let time: number | null = l.lap_time_ms / 1000;
            if (time > 180 || !l.is_valid) {
                time = null; 
            }
            dataByLap[l.lap_number][name] = time ? parseFloat(time.toFixed(3)) : null;
        });

        return {
            chartData: Object.values(dataByLap).sort((a, b) => a.lap - b.lap),
            drivers: Array.from(driversMap.values()).sort((a,b) => a.name.localeCompare(b.name))
        };
    }, [laps]);

    const formatTime = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : `${secs}s`;
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} opacity={0.3} />
                <XAxis 
                    dataKey="lap" 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'LAP', position: 'insideBottomRight', offset: 0, fontSize: 9, fill: 'var(--text-muted)', fontWeight: 800 }}
                />
                <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={formatTime}
                    label={{ value: 'TIME', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--text-muted)', offset: 10, fontWeight: 800 }}
                />
                <Tooltip 
                    contentStyle={{ 
                        background: 'rgba(11, 11, 14, 0.95)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--glass-border)', 
                        borderRadius: '4px', 
                        fontSize: '10px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    labelFormatter={(l) => `LAP ${l}`}
                    formatter={(v: any) => [formatTime(v), 'PACE']}
                />
                <Legend 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '9px', fontWeight: 800, paddingTop: '20px', textTransform: 'uppercase', color: 'var(--text-muted)' }} 
                />
                {drivers.map(d => (
                    <Line
                        key={d.name}
                        type="monotone"
                        dataKey={d.name}
                        stroke={d.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls={true}
                        isAnimationActive={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
