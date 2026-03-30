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
    ReferenceArea,
    ReferenceLine,
    Label
} from 'recharts';

interface Sample {
    d: number; // distance
    s: number; // speed
    t: number; // throttle
    b: number; // brake
    st: number; // steer
}

interface TrackTurn {
    curve_name: string;
    distance_start: number;
    distance_end: number;
}

interface DriverTraceProps {
    data1: Sample[];
    data2: Sample[];
    label1: string;
    label2: string;
    color1: string;
    color2: string;
    turns?: TrackTurn[];
    pitEntry?: number | null;
    pitExit?: number | null;
}

export default function DriverTrace({ data1, data2, label1, label2, color1, color2, turns = [], pitEntry, pitExit }: DriverTraceProps) {
    // Merge data for Recharts (plotting against distance)
    const mergedData = useMemo(() => {
        if (!data1.length) return [];
        return data1.map(s1 => {
            // Find closest sample in data2 for comparison
            const s2 = data2.length > 0 ? data2.reduce((prev, curr) => 
                Math.abs(curr.d - s1.d) < Math.abs(prev.d - s1.d) ? curr : prev
            ) : s1;

            return {
                dist: Math.round(s1.d),
                [`speed_${label1}`]: Math.round(s1.s),
                [`speed_${label2}`]: Math.round(s2.s),
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

    const ChartHeader = ({ title, color, icon }: { title: string, color: string, icon?: React.ReactNode }) => (
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-1.5 h-3 rounded-sm" style={{ backgroundColor: color }}></span>
                {title}
            </h3>
            <div className="text-[10px] text-silver/20 font-mono italic">TELEMETRY_ENGINE_V3.1</div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-left-4 duration-1000">
            {/* Speed Chart */}
            <div className="glass-panel p-6 border-t-2 border-t-f1-red/30">
                <ChartHeader title="Geschwindigkeit (km/h)" color="#3b82f6" />
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            
                            {/* Turns Overlay */}
                            {turns.map((turn, idx) => (
                                <ReferenceArea 
                                    key={idx}
                                    x1={turn.distance_start} 
                                    x2={turn.distance_end} 
                                    fill={idx % 2 === 0 ? "#ffffff08" : "#ffffff03"}
                                    stroke="none"
                                >
                                    <Label 
                                        value={turn.curve_name} 
                                        position="top" 
                                        fill="#ffffff30" 
                                        offset={10} 
                                        style={{ fontSize: '10px', fontWeight: 900, fontStyle: 'italic' }} 
                                    />
                                </ReferenceArea>
                            ))}

                            {/* Pit Markers */}
                            {pitEntry && (
                                <ReferenceLine x={pitEntry} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5}>
                                    <Label value="PIT ENTRY" position="insideTopLeft" fill="#ef4444" fontSize={9} fontWeight="bold" />
                                </ReferenceLine>
                            )}
                            {pitExit && (
                                <ReferenceLine x={pitExit} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5}>
                                    <Label value="PIT EXIT" position="insideTopLeft" fill="#22c55e" fontSize={9} fontWeight="bold" />
                                </ReferenceLine>
                            )}

                            <XAxis 
                                dataKey="dist" 
                                stroke="#ffffff20" 
                                fontSize={10} 
                                tickFormatter={(val) => `${val}m`}
                                tick={{ fill: '#94a3b8' }}
                                minTickGap={50}
                            />
                            <YAxis stroke="#ffffff20" fontSize={10} tick={{ fill: '#94a3b8' }} domain={['auto', 'auto']} />
                            <Tooltip 
                                cursor={{ stroke: '#ffffff30', strokeWidth: 1 }}
                                contentStyle={{ 
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                    border: '1px solid rgba(232, 0, 45, 0.3)', 
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                    backdropFilter: 'blur(8px)'
                                }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}
                                labelStyle={{ color: '#ef4444', fontWeight: 900, marginBottom: '5px' }}
                            />
                            <Line 
                                name={label1} 
                                type="monotone" 
                                dataKey={`speed_${label1}`} 
                                stroke={color1} 
                                strokeWidth={3} 
                                dot={false} 
                                animationDuration={1000}
                                activeDot={{ r: 4, stroke: 'white', strokeWidth: 2 }}
                            />
                            <Line 
                                name={label2} 
                                type="monotone" 
                                dataKey={`speed_${label2}`} 
                                stroke={color2} 
                                strokeWidth={2} 
                                dot={false}
                                strokeDasharray="4 4"
                                opacity={0.7}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Throttle & Brake Chart */}
            <div className="glass-panel p-6 border-t-2 border-t-green-500/30">
                <ChartHeader title="Pedal-Input (%)" color="#22c55e" />
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <XAxis dataKey="dist" hide />
                            <YAxis stroke="#ffffff10" fontSize={10} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                            
                            <Line name={`${label1} Gas`} type="monotone" dataKey={`throttle_${label1}`} stroke="#22c55e" strokeWidth={2} dot={false} />
                            <Line name={`${label2} Gas`} type="monotone" dataKey={`throttle_${label2}`} stroke="#22c55e" strokeWidth={1} dot={false} strokeDasharray="2 2" opacity={0.5} />
                            
                            <Line name={`${label1} Bremse`} type="monotone" dataKey={`brake_${label1}`} stroke="#ef4444" strokeWidth={2} dot={false} />
                            <Line name={`${label2} Bremse`} type="monotone" dataKey={`brake_${label2}`} stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="2 2" opacity={0.5} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Steering Chart */}
            <div className="glass-panel p-6 border-t-2 border-t-orange-500/30">
                <ChartHeader title="Lenkwinkel (%)" color="#f97316" />
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <XAxis dataKey="dist" hide />
                            <YAxis stroke="#ffffff10" fontSize={10} domain={[-100, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                            <Line name={label1} type="monotone" dataKey={`steer_${label1}`} stroke={color1} strokeWidth={2} dot={false} />
                            <Line name={label2} type="monotone" dataKey={`steer_${label2}`} stroke={color2} strokeWidth={1} dot={false} strokeDasharray="2 2" opacity={0.5} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
