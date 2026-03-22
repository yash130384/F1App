'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface PositionEntry {
    car_index: number;
    lap_number: number;
    position: number;
}

interface Participant {
    game_name: string;
    driver_name?: string;
    driver_color?: string;
    car_index: number;
    position: number;
}

interface LapPositionChartProps {
    participants: Participant[];
    history: PositionEntry[];
    totalLaps: number;
}

export function LapPositionChart({ participants, history, totalLaps }: LapPositionChartProps) {
    // Mapping von car_index auf Teilnehmer erstellen
    const carIndexMap: Record<number, Participant> = {};
    participants.forEach(p => {
        carIndexMap[p.car_index] = p;
    });

    // Top-Fahrer nach finaler Position für die Legende (Top 10)
    const topDrivers = [...participants].sort((a, b) => a.position - b.position).slice(0, 10);
    
    // Transform history into Recharts format: { lap: 1, driver1: 1, driver2: 2, ... }
    const dataByLap: Record<number, any> = {};
    
    history.forEach(entry => {
        if (!dataByLap[entry.lap_number]) {
            dataByLap[entry.lap_number] = { lap: entry.lap_number };
        }
        
        const driver = carIndexMap[entry.car_index];
        if (driver) {
            dataByLap[entry.lap_number][driver.game_name] = entry.position;
        }
    });

    const chartData = Object.values(dataByLap).sort((a, b) => a.lap - b.lap);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            height: 450,
        }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 20 }}>
                Race Position Evolution (Top 10)
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="lap" 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        label={{ value: 'LAP', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: '#666' }}
                    />
                    <YAxis 
                        reversed 
                        domain={[1, 20]} 
                        stroke="#666" 
                        fontSize={10} 
                        tickLine={false}
                        ticks={[1, 5, 10, 15, 20]}
                        label={{ value: 'POSITION', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#666', offset: 10 }}
                    />
                    <Tooltip 
                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ padding: '2px 0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 15 }} />
                    {topDrivers.map((p, i) => (
                        <Line
                            key={p.game_name}
                            type="monotone"
                            dataKey={p.game_name}
                            name={p.driver_name || p.game_name}
                            stroke={p.driver_color || '#888'}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4 }}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
