'use client';

import React, { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface DriverScore {
  brake: number;
  throttle: number;
  consistency: number;
  overall: number;
}

interface PerformanceScorecardProps {
  scores: Record<string, DriverScore>;
  drivers: Array<{ id: string; name: string; color: string }>;
}

export default function PerformanceScorecard({ scores, drivers }: PerformanceScorecardProps) {
  // Transform scores for Radar Chart (per driver)
  const driverData = useMemo(() => {
    return drivers.map(d => {
      const s = scores[d.id] || { brake: 0, throttle: 0, consistency: 0, overall: 0 };
      return {
        name: d.name,
        color: d.color,
        scores: [
          { subject: 'Bremsen', value: s.brake },
          { subject: 'Gasgeben', value: s.throttle },
          { subject: 'Konstanz', value: s.consistency },
          { subject: 'Kurven-Speed', value: Math.round((s.brake + s.throttle) / 2) }, // Simplified placeholder for curve speed
          { subject: 'Reifen-Mgmt', value: Math.round((s.throttle + s.consistency) / 2) }, // Simplified
        ]
      };
    });
  }, [scores, drivers]);

  if (Object.keys(scores).length === 0) {
    return (
      <div className="p-12 text-center glass-panel">
        <div className="text-f1-bold text-white/20 text-3xl mb-4 italic uppercase">NOT ENOUGH DATA</div>
        <p className="text-silver/60">Complete at least 3 valid laps to generate performance metrics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {driverData.map((data, idx) => (
          <div key={idx} className="glass-panel p-8 relative overflow-hidden group">
            {/* Background Glow */}
            <div 
              className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-opacity group-hover:opacity-20"
              style={{ backgroundColor: data.color }}
            />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
               <div>
                  <h3 className="text-f1-bold text-2xl italic uppercase tracking-tighter leading-none mb-1">
                    {data.name}
                  </h3>
                  <div className="flex items-center gap-2">
                     <div className="h-[2px] w-4" style={{ backgroundColor: data.color }} />
                     <span className="text-[10px] text-silver/40 font-black tracking-[0.2em] uppercase">Driver Profile Analytics</span>
                  </div>
               </div>
               
               <div className="text-right">
                  <div className="text-4xl text-f1-bold italic text-f1-red leading-none">
                    {scores[drivers.find(d => d.name === data.name)?.id || '']?.overall || 0}
                  </div>
                  <div className="text-[10px] text-white/20 font-mono uppercase">Overall Rating</div>
               </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.scores}>
                  <PolarGrid stroke="#ffffff10" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={data.name}
                    dataKey="value"
                    stroke={data.color}
                    fill={data.color}
                    fillOpacity={0.4}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: `1px solid ${data.color}40`, borderRadius: '8px' }}
                    itemStyle={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Metric Breakdown */}
            <div className="grid grid-cols-3 gap-4 mt-8 relative z-10">
               {[
                 { label: 'Brake Efficiency', val: scores[drivers.find(d => d.name === data.name)?.id || '']?.brake },
                 { label: 'Throttle Smoothness', val: scores[drivers.find(d => d.name === data.name)?.id || '']?.throttle },
                 { label: 'Lap Consistency', val: scores[drivers.find(d => d.name === data.name)?.id || '']?.consistency }
               ].map(m => (
                 <div key={m.label} className="flex flex-col gap-1">
                    <span className="text-[10px] text-silver/30 font-bold uppercase truncate">{m.label}</span>
                    <div className="flex items-end gap-1">
                       <span className="text-lg text-f1-bold italic leading-none">{m.val}</span>
                       <span className="text-[8px] text-white/20 mb-1">/100</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full transition-all duration-1000" style={{ width: `${m.val}%`, backgroundColor: data.color }} />
                    </div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
