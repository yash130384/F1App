'use client';

import React from 'react';
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

interface GapToLeaderChartProps {
    laps: LapEntry[];
}

export default function GapToLeaderChart({ laps }: GapToLeaderChartProps) {
    // 1. Calculate accumulated time for each driver
    const totalTimes = new Map<string, Map<number, number>>(); // driver -> lap -> totalTime
    const drivers = new Map<string, { name: string, color: string }>();

    // Sort by lap number first to ensure accumulation works
    const sortedLaps = [...laps].sort((a,b) => a.lap_number - b.lap_number);

    sortedLaps.forEach(l => {
        const name = l.driver_name || l.game_name;
        drivers.set(name, { name, color: l.driver_color || '#888' });

        if (!totalTimes.has(name)) totalTimes.set(name, new Map());
        
        // Find previous total time for this driver
        let prevTotal = 0;
        const driverLaps = totalTimes.get(name)!;
        if (l.lap_number > 1) {
            // Find the most recent lap total we have
            for (let i = l.lap_number - 1; i >= 0; i--) {
                if (driverLaps.has(i)) {
                    prevTotal = driverLaps.get(i)!;
                    break;
                }
            }
        }

        driverLaps.set(l.lap_number, prevTotal + l.lap_time_ms);
    });

    // 2. Identify leader for each lap and calculate gaps
    const dataByLap: Record<number, any> = {};
    const ALL_LAPS = [...new Set(laps.map(l => l.lap_number))].sort((a,b) => a-b);
    
    // Skip lap 0
    const relevantLaps = ALL_LAPS.filter(l => l > 0);

    relevantLaps.forEach(lap => {
        let leaderTime = Infinity;
        
        // Find leader's total time at this lap
        totalTimes.forEach((lapMap) => {
            const time = lapMap.get(lap);
            if (time !== undefined && time < leaderTime) leaderTime = time;
        });

        if (leaderTime === Infinity) return;

        dataByLap[lap] = { lap };
        
        totalTimes.forEach((lapMap, driverName) => {
            const time = lapMap.get(lap);
            if (time !== undefined) {
                const gap = (time - leaderTime) / 1000;
                dataByLap[lap][driverName] = parseFloat(gap.toFixed(3));
            }
        });
    });

    const chartData = Object.values(dataByLap).sort((a, b) => a.lap - b.lap);
    const sortedDrivers = Array.from(drivers.values()).sort((a,b) => a.name.localeCompare(b.name));

    return (
        <div className="p-6 f1-card" style={{ height: 500 }}>
             <div className="mb-6">
                <h3 className="text-white font-bold text-lg">Gap to Leader</h3>
                <p className="text-slate-500 text-xs uppercase font-bold">Zeitabstand zum Führenden in Sekunden (Positiv = Rückstand)</p>
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
                        reversed
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        domain={[0, 'auto']}
                        tickFormatter={(v) => `+${v}s`}
                        label={{ value: 'GAP (S)', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#666' }}
                    />
                    <Tooltip 
                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ padding: '2px 0' }}
                        formatter={(v: any) => [`+${v}s`, 'Abstand']}
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
