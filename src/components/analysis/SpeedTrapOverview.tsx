'use client';

import React, { useMemo } from 'react';

interface SpeedTrap {
  participant_id: string;
  driver_name: string;
  driver_color: string;
  game_name: string;
  speed: number;
  lap_number: number;
  distance: number;
}

interface SpeedTrapOverviewProps {
  traps: SpeedTrap[];
}

export default function SpeedTrapOverview({ traps }: SpeedTrapOverviewProps) {
  // Deduplicate and get best for each driver/distance combination
  const processedTraps = useMemo(() => {
    // Group traps by approximate distance (bucket for different traps on track)
    const distanceThreshold = 100; // 100m buckets for different trap locations
    const locations = new Map<number, SpeedTrap[]>();
    
    traps.forEach(trap => {
      // Find matching bucket or create new
      let bucketKey = Math.round(trap.distance / distanceThreshold) * distanceThreshold;
      if (!locations.has(bucketKey)) locations.set(bucketKey, []);
      locations.get(bucketKey)!.push(trap);
    });

    // For each bucket, keep only the best speed for each unique driver
    const sortedLocations = Array.from(locations.entries())
      .map(([dist, areaTraps]) => {
        const driversMap = new Map<string, SpeedTrap>();
        areaTraps.forEach(t => {
          if (!driversMap.has(t.participant_id) || t.speed > driversMap.get(t.participant_id)!.speed) {
            driversMap.set(t.participant_id, t);
          }
        });
        
        return {
          distance: dist,
          bestTraps: Array.from(driversMap.values()).sort((a, b) => b.speed - a.speed)
        };
      })
      .filter(loc => loc.bestTraps.length > 0)
      .sort((a, b) => a.distance - b.distance);

    return sortedLocations;
  }, [traps]);

  if (traps.length === 0) {
    return (
      <div className="p-12 text-center glass-panel">
        <div className="text-f1-bold text-white/20 text-3xl mb-4 italic uppercase">NOT TARGET ACQUIRED</div>
        <p className="text-silver/60">Speed trap data will appear after drivers pass measurement points.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 animate-in slide-in-from-right-8 duration-1000">
      {processedTraps.map((location, locIdx) => (
        <div key={location.distance} className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
             <div className="h-[2px] w-8 bg-f1-red shadow-[0_0_10px_rgba(232,0,45,0.8)]"></div>
             <h3 className="text-f1-bold text-lg italic uppercase tracking-tighter">
                Speed Trap <span className="text-f1-red font-mono">@{location.distance}m</span>
             </h3>
             <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {location.bestTraps.slice(0, 8).map((trap, idx) => (
              <div 
                key={trap.participant_id} 
                className="f1-card relative overflow-hidden group hover:scale-[1.02] transition-transform"
                style={{ padding: '1rem' }}
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1" 
                  style={{ backgroundColor: trap.driver_color || '#fff' }} 
                />
                
                <div className="flex justify-between items-center relative z-10">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-f1-red font-mono font-bold">P{idx + 1}</span>
                      <span className="text-f1-bold text-sm uppercase">{trap.driver_name || trap.game_name}</span>
                      <span className="text-[10px] text-silver/40 font-mono">LAP {trap.lap_number}</span>
                   </div>
                   
                   <div className="text-right">
                      <div className="text-2xl text-f1-bold italic tracking-tighter text-gradient leading-none">
                        {Math.floor(trap.speed)}
                      </div>
                      <div className="text-[10px] text-white/20 font-mono uppercase tracking-[0.2em]">km/h</div>
                   </div>
                </div>

                {/* Background Text Decor */}
                <div className="absolute right-0 bottom-0 text-6xl font-black text-white/[0.02] -mb-4 -mr-2 pointer-events-none italic">
                   {Math.floor(trap.speed)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
