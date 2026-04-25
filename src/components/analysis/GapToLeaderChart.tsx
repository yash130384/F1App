'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface LapEntry {
    participantId: string;
    lapNumber: number;
    lapTimeMs: number;
    isValid: boolean;
    driverName?: string;
    gameName: string;
    driverColor?: string;
}

interface GapToLeaderChartProps {
    laps: LapEntry[];
}

export default function GapToLeaderChart({ laps }: GapToLeaderChartProps) {
    // 1. Calculate accumulated time for each driver
    const { chartData, drivers } = React.useMemo(() => {
        const totalTimes = new Map<string, Map<number, number>>(); // driver -> lap -> totalTime
        const driversMap = new Map<string, { name: string, color: string }>();

        // Sort by lap number first to ensure accumulation works
        const sortedLaps = [...laps].sort((a,b) => a.lapNumber - b.lapNumber);

        sortedLaps.forEach(l => {
            const name = l.driverName || l.gameName;
            driversMap.set(name, { name, color: l.driverColor || 'var(--text-muted)' });

            if (!totalTimes.has(name)) totalTimes.set(name, new Map());
            
            let prevTotal = 0;
            const driverLaps = totalTimes.get(name)!;
            if (l.lapNumber > 1) {
                for (let i = l.lapNumber - 1; i >= 0; i--) {
                    if (driverLaps.has(i)) {
                        prevTotal = driverLaps.get(i)!;
                        break;
                    }
                }
            }
            driverLaps.set(l.lapNumber, prevTotal + l.lapTimeMs);
        });

        // 2. Identify leader for each lap and calculate gaps
        const dataByLap: Record<number, any> = {};
        const ALL_LAPS = [...new Set(laps.map(l => l.lapNumber))].sort((a,b) => a-b);
        const relevantLaps = ALL_LAPS.filter(l => l > 0);

        relevantLaps.forEach(lap => {
            let leaderTime = Infinity;
            totalTimes.forEach((lapMap) => {
                const time = lapMap.get(lap);
                if (time !== undefined && time < leaderTime) leaderTime = time;
            });

            if (leaderTime === Infinity) return;
            dataByLap[lap] = { lap };
            
            totalTimes.forEach((lapMap, driverName) => {
                const driverFinishedThisLap = laps.some(l => (l.driverName || l.gameName) === driverName && l.lapNumber === lap);
                const time = lapMap.get(lap);
                if (time !== undefined && driverFinishedThisLap) {
                    const gap = (time - leaderTime) / 1000;
                    dataByLap[lap][driverName] = parseFloat(gap.toFixed(3));
                }
            });
        });

        return {
            chartData: Object.values(dataByLap).sort((a, b) => a.lap - b.lap),
            drivers: Array.from(driversMap.values()).sort((a,b) => a.name.localeCompare(b.name))
        };
    }, [laps]);

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
                    reversed
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                    tickFormatter={(v) => `+${v}s`}
                    label={{ value: 'GAP (S)', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--text-muted)', offset: 10, fontWeight: 800 }}
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
                    formatter={(v: any) => [`+${v}s`, 'GAP']}
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
