'use client';

import React, { useState, useEffect } from 'react';
import { getLeagueRaces, deleteRace } from '@/lib/actions';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import Link from 'next/link';

export default function RaceManagementPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRaces();
  }, [leagueId]);

  async function loadRaces() {
    setLoading(true);
    const res = await getLeagueRaces(leagueId);
    if (res.success) {
      setRaces(res.races || []);
    } else {
      setError(res.error || 'Failed to load races');
    }
    setLoading(false);
  }

  const handleDelete = async (raceId: string) => {
    if (!confirm('Are you sure you want to delete this race and all its results? This cannot be undone.')) return;
    
    const res = await deleteRace(raceId, leagueId);
    if (res.success) {
      setRaces(races.filter(r => r.id !== raceId));
    } else {
      alert('Error deleting race: ' + res.error);
    }
  };

  if (loading && races.length === 0) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href={`/profile/leagues/${leagueId}`} className="btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                BACK
            </Link>
            <span className="text-f1" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>ADMINISTRATION</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>RACE CALENDAR</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage all events and results associated with this league.</p>
            </div>
            <Link href={`/profile/leagues/${leagueId}/results`}>
                <button className="btn-primary">ADD NEW RESULT</button>
            </Link>
        </div>
      </header>

      {races.length === 0 ? (
        <div className="f1-card p-12 text-center" style={{ opacity: 0.5 }}>
            <h3 className="text-f1">NO RACES SCHEDULED</h3>
            <p>Add your first race result to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
            {races.map((race) => (
                <div key={race.id} className="f1-card flex justify-between items-center p-6" style={{ borderLeft: race.is_finished ? '4px solid var(--f1-red)' : '4px solid var(--f1-cyan)' }}>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-f1" style={{ fontSize: '1.2rem' }}>{race.track}</span>
                            <span style={{ 
                                fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', background: race.is_finished ? 'rgba(255,24,1,0.2)' : 'rgba(0,245,255,0.1)', 
                                color: race.is_finished ? 'var(--f1-red)' : 'var(--f1-cyan)', fontWeight: 900 
                            }}>
                                {race.is_finished ? 'FINISHED' : 'SCHEDULED'}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {race.scheduled_date ? new Date(race.scheduled_date).toLocaleDateString() : 'No date set'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {race.is_finished && (
                            <Link href={`/profile/leagues/${leagueId}/results?raceId=${race.id}`}>
                                <button className="btn-secondary btn-sm" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>EDIT RESULTS</button>
                            </Link>
                        )}
                        <button className="btn-secondary btn-sm" style={{ color: 'var(--f1-red)', borderColor: 'rgba(255,24,1,0.2)' }} onClick={() => handleDelete(race.id)}>DELETE</button>
                    </div>
                </div>
            ))}
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
