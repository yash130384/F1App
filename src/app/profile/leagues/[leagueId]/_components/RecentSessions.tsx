'use client';

import React, { useState, useEffect } from 'react';
import { getPublicLeagueRaces } from '@/lib/actions';
import { useParams } from 'next/navigation';
import styles from '../LeagueDashboard.module.css';

/**
 * Zeigt die letzten und kommenden Rennen einer Liga an.
 */
export default function RecentSessions() {
  const { leagueId } = useParams() as { leagueId: string };
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getPublicLeagueRaces(leagueId);
        if (res.success) {
          setRaces(res.races || []);
        }
      } catch (err) {
        console.error("Failed to load races:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leagueId]);

  if (loading) return (
     <section className="glass-panel p-6">
       <h2 className={`text-f1 ${styles.sectionTitle}`}>UPCOMING & RECENT</h2>
       <div className="animate-pulse flex flex-col gap-3">
         <div className="h-12 bg-carbon-800/50 rounded"></div>
         <div className="h-12 bg-carbon-800/50 rounded"></div>
       </div>
     </section>
  );

  return (
    <section className="glass-panel p-6">
      <h2 className={`text-f1 ${styles.sectionTitle}`}>UPCOMING & RECENT</h2>
      
      {races.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--silver)', opacity: 0.5 }}>
          No races scheduled yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {races.slice(0, 10).map((race) => (
            <div 
                key={race.id} 
                className="flex justify-between items-center p-3 rounded bg-carbon-800/20 border border-glass"
                style={{ borderLeft: race.isFinished ? '3px solid var(--f1-red)' : '3px solid var(--f1-cyan)' }}
            >
              <div className="flex flex-col">
                <span className={`font-bold ${race.isHidden ? 'italic opacity-60' : ''}`} style={{ fontSize: '0.9rem', color: race.isHidden ? 'var(--silver)' : 'white' }}>
                    {race.track || 'Unscheduled Track'}
                    {race.isRandom && !race.isFinished && <span className="ml-2 text-[0.6rem] text-[#ffb700] border border-[#ffb700] px-1 rounded">RANDOM</span>}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--silver)' }}>
                    {race.scheduledDate ? new Date(race.scheduledDate).toLocaleDateString() : 'TBA'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                 <span style={{ 
                    fontSize: '0.55rem', padding: '1px 5px', borderRadius: '3px',
                    background: race.isFinished ? 'rgba(255,24,1,0.1)' : 'rgba(0,245,255,0.05)',
                    color: race.isFinished ? 'var(--f1-red)' : 'var(--f1-cyan)', border: '1px solid currentColor', fontWeight: 900
                 }}>
                    {race.isFinished ? 'FINISHED' : 'PLANNED'}
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
