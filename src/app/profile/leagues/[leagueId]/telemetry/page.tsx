'use client';

import React, { useState, useEffect } from 'react';
import { getTelemetrySessionsForLeague, getUnassignedTelemetrySessions, linkTelemetryToLeague } from '@/lib/actions';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import Link from 'next/link';

export default function TelemetryHubPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [sessions, setSessions] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [leagueId]);

  async function loadData() {
    setLoading(true);
    const [sessRes, unRes] = await Promise.all([
      getTelemetrySessionsForLeague(leagueId),
      getUnassignedTelemetrySessions()
    ]);

    if (sessRes.success) setSessions(sessRes.sessions || []);
    if (unRes.success) setUnassigned(unRes.sessions || []);

    if (!sessRes.success || !unRes.success) {
      setError(sessRes.error || unRes.error || 'Failed to sync with telemetry node.');
    }
    setLoading(false);
  }

  const handleLink = async (sessionId: string) => {
    setLinking(sessionId);
    const res = await linkTelemetryToLeague(sessionId, leagueId);
    if (res.success) {
      loadData();
    } else {
      alert('Error: ' + res.error);
    }
    setLinking(null);
  };

  const getSessionTypeName = (type: number) => {
    switch (type) {
      case 1: return 'Practice';
      case 10: return 'Qualifying';
      case 11: return 'Short Qualifying';
      case 12: return 'One-Shot Qualifying';
      case 13: return 'Race';
      default: return `Session (${type})`;
    }
  };

  if (loading && sessions.length === 0) return <LoadingState />;
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
        <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>TELEMETRY HUB</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage data recordings and link incoming telemetry to this league.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '3rem' }}>
        
        {/* Linked Sessions */}
        <section>
            <h2 className="text-f1" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--f1-red)' }}>ASSIGNED SESSIONS</h2>
            {sessions.length === 0 ? (
                <div className="f1-card p-8 text-center" style={{ opacity: 0.5 }}>
                    <p>No telemetry sessions linked to this league yet.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {sessions.map((s) => (
                        <Link href={`/profile/analysis/${s.id}`} key={s.id}>
                            <div className="f1-card flex justify-between items-center p-5 hover-lift">
                                <div className="flex items-center gap-4">
                                    <div className="text-f1" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
                                        #{s.id.slice(0,6)}
                                    </div>
                                    <div>
                                        <div className="text-f1" style={{ fontSize: '1.1rem' }}>ID {s.track_id} | {getSessionTypeName(s.session_type)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Record Date: {new Date(s.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>

        {/* Unassigned / Incoming */}
        <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-f1" style={{ fontSize: '1.2rem' }}>UNASSIGNED DATA STREAM</h2>
                <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', border: '1px solid var(--f1-red)', padding: '2px 8px', borderRadius: '4px' }}>LIVE NODE ACTIVE</span>
            </div>
            
            {unassigned.length === 0 ? (
                <div className="f1-card p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', borderStyle: 'dashed' }}>
                    <p style={{ color: 'var(--silver)' }}>Waiting for new data from telemetry router...</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {unassigned.map((s) => (
                        <div key={s.id} className="f1-card flex justify-between items-center p-4" style={{ background: 'rgba(255,24,1,0.03)', borderColor: 'rgba(255,24,1,0.1)' }}>
                            <div>
                                <div className="text-f1" style={{ fontSize: '0.9rem', marginBottom: '2px' }}>ID {s.track_id} - {getSessionTypeName(s.session_type)}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>Captured: {new Date(s.created_at).toLocaleString()}</div>
                            </div>
                            <button 
                                className="btn-primary btn-sm" 
                                disabled={linking === s.id}
                                onClick={() => handleLink(s.id)}
                            >
                                {linking === s.id ? 'LINKING...' : 'CLAIM SESSION'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>

      </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .hover-lift { transition: transform 0.2s; }
        .hover-lift:hover { transform: translateY(-2px); border-color: var(--f1-red); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
