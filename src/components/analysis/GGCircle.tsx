'use client';

import React, { useMemo } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';

interface Sample {
    gLat: number;
    gLon: number;
}

interface GGCircleProps {
    samples: Sample[];
    driverName: string;
    color: string;
}

export default function GGCircle({ samples, driverName, color }: GGCircleProps) {
    // Recharts Scatter data
    const data = useMemo(() => {
        // Take a selection of samples to avoid overcrowding
        const step = Math.max(1, Math.floor(samples.length / 500));
        return samples
            .filter((_, i) => i % step === 0)
            .map(s => ({
                x: s.gLat,
                y: s.gLon,
                z: 1  // dummy for ZAxis
            }));
    }, [samples]);

    return (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-xl animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center">
                <h3 className="text-white font-bold mb-2 text-xl">{driverName} - Traction Circle</h3>
                <p className="text-slate-400 text-xs mb-6 uppercase tracking-widest">G-Force Distribution (Lateral vs Longitudinal)</p>
                
                <div className="w-full h-[400px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis 
                                type="number" 
                                dataKey="x" 
                                name="Lateral" 
                                domain={[-5, 5]} 
                                stroke="#64748b" 
                                tick={{fontSize: 10}}
                                label={{ value: 'Lateral G (Links / Rechts)', position: 'bottom', fill: '#64748b', fontSize: 10, offset: 0 }}
                            />
                            <YAxis 
                                type="number" 
                                dataKey="y" 
                                name="Longitudinal" 
                                domain={[-5, 5]} 
                                stroke="#64748b"
                                tick={{fontSize: 10}}
                                label={{ value: 'Bremse / Gas', angle: -90, position: 'left', fill: '#64748b', fontSize: 10 }}
                            />
                            <ZAxis type="number" range={[10, 10]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            
                            <ReferenceLine x={0} stroke="#ffffff20" />
                            <ReferenceLine y={0} stroke="#ffffff20" />
                            
                            {/* Visual reference for 1G, 2G, 3G circles would be cool, but ScatterChart doesn't support circles easily */}
                            
                            <Scatter name={driverName} data={data} fill={color} fillOpacity={0.6}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                    
                    {/* Background Circles (SVG Overlay for actual Circle look) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                         <div className="border border-white rounded-full w-[20%] h-[20%]"></div>
                         <div className="border border-white rounded-full w-[40%] h-[40%] absolute"></div>
                         <div className="border border-white rounded-full w-[60%] h-[60%] absolute"></div>
                         <div className="border border-white rounded-full w-[80%] h-[80%] absolute"></div>
                    </div>
                </div>

                <div className="mt-6 flex gap-8 text-center">
                    <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Max Lat G</div>
                        <div className="text-white text-xl font-black">
                            {Math.max(...samples.map(s => Math.abs(s.gLat))).toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10 mt-2"></div>
                    <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Max Braking G</div>
                        <div className="text-white text-xl font-black text-red-400">
                            {Math.min(...samples.map(s => s.gLon)).toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-8 bg-white/10 mt-2"></div>
                    <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Max Accel G</div>
                        <div className="text-white text-xl font-black text-green-400">
                            {Math.max(...samples.map(s => s.gLon)).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
