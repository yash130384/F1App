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
    position: number;
}

interface LapPositionChartProps {
    participants: Participant[];
    history: PositionEntry[];
    totalLaps: number;
}

export function LapPositionChart({ participants, history, totalLaps }: LapPositionChartProps) {
    // Transform history into Recharts format: { lap: 1, driver1: 1, driver2: 2, ... }
    const dataByLap: Record<number, any> = {};
    
    // Only track top 10 or selected drivers for clarity
    const topDrivers = participants.sort((a, b) => a.position - b.position).slice(0, 8);
    const driverIds = topDrivers.map((p, i) => i); // Using car_index or index here

    history.forEach(entry => {
        if (!dataByLap[entry.lap_number]) {
            dataByLap[entry.lap_number] = { lap: entry.lap_number };
        }
        // Find driver name for this car index
        // Note: entry.car_index is 0-21. participants order might match or we need a mapping.
        // For now, let's assume index matches or just show based on car_index
        const driver = participants[entry.car_index];
        if (driver) {
            dataByLap[entry.lap_number][driver.game_name] = entry.position;
        }
    });

    const chartData = Object.values(dataByLap).sort((a, b) => a.lap - b.lap);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1.5rem',
            height: 400,
        }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 20 }}>
                Position Change History (Top 8)
            </div>

            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                        dataKey="lap" 
                        stroke="#444" 
                        fontSize={10} 
                        tickLine={false}
                        label={{ value: 'LAP', position: 'insideBottomRight', offset: -5, fontSize: 9, fill: '#444' }}
                    />
                    <YAxis 
                        reversed 
                        domain={[1, 22]} 
                        stroke="#444" 
                        fontSize={10} 
                        tickLine={false}
                        ticks={[1, 5, 10, 15, 20]}
                        label={{ value: 'POS', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#444' }}
                    />
                    <Tooltip 
                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        itemStyle={{ padding: '2px 0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    {topDrivers.map((p, i) => (
                        <Line
                            key={p.game_name}
                            type="stepAfter"
                            dataKey={p.game_name}
                            name={p.driver_name || p.game_name}
                            stroke={colors[i % colors.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
