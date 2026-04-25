'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface PositionEntry {
    carIndex: number;
    lapNumber: number;
    position: number;
}

interface Participant {
    gameName: string;
    driverName?: string;
    driverColor?: string;
    carIndex: number;
    position: number;
}

interface LapPositionChartProps {
    participants: Participant[];
    history: PositionEntry[];
    totalLaps: number;
}

export function LapPositionChart({ participants, history, totalLaps }: LapPositionChartProps) {
    // Mapping von carIndex auf Teilnehmer erstellen
    const carIndexMap: Record<number, Participant> = React.useMemo(() => {
        const map: Record<number, Participant> = {};
        participants.forEach(p => {
            map[p.carIndex] = p;
        });
        return map;
    }, [participants]);

    // Top-Fahrer nach finaler Position für die Legende (Top 10)
    const topDrivers = React.useMemo(() => 
        [...participants].sort((a, b) => a.position - b.position).slice(0, 10),
    [participants]);
    
    // Transform history into Recharts format
    const chartData = React.useMemo(() => {
        const dataByLap: Record<number, any> = {};
        history.forEach(entry => {
            if (!dataByLap[entry.lapNumber]) {
                dataByLap[entry.lapNumber] = { lap: entry.lapNumber };
            }
            const driver = carIndexMap[entry.carIndex];
            if (driver) {
                dataByLap[entry.lapNumber][driver.gameName] = entry.position;
            }
        });
        return Object.values(dataByLap).sort((a, b) => a.lap - b.lap);
    }, [history, carIndexMap]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
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
                    domain={[1, 20]} 
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    ticks={[1, 5, 10, 15, 20]}
                    label={{ value: 'POSITION', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'var(--text-muted)', offset: 10, fontWeight: 800 }}
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
                    itemStyle={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                />
                <Legend 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '9px', fontWeight: 800, paddingTop: '20px', textTransform: 'uppercase', color: 'var(--text-muted)' }} 
                />
                {topDrivers.map((p, i) => (
                    <Line
                        key={p.gameName}
                        type="monotone"
                        dataKey={p.gameName}
                        name={p.driverName || p.gameName}
                        stroke={p.driverColor || 'var(--text-muted)'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        isAnimationActive={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
