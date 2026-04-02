'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTelemetrySessionDetails, assignTelemetryPlayer, getDashboardData } from '@/lib/actions';
import { LoadingState, ErrorState } from '../../_components/StatusScreens';
import Link from 'next/link';

export default function SessionAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [leagueId, sessionId]);

  async function loadData() {
    setLoading(true);
    const [detailsRes, dashRes] = await Promise.all([
      getTelemetrySessionDetails(leagueId, sessionId),
      getDashboardData(leagueId)
    ]);

    if (detailsRes.success) {
      setSession(detailsRes.session);
      setParticipants(detailsRes.participants || []);
    }
    if (dashRes.success) {
      setDrivers(dashRes.standings || []);
    }

    if (!detailsRes.success) setError(detailsRes.error);
    setLoading(false);
  }

  const handleAssign = async (gameName: string, driverId: string | null) => {
    setSaving(gameName);
    try {
        const res = await assignTelemetryPlayer(leagueId, gameName, driverId || ''); 
        // Note: assignTelemetryPlayer currently expects strings, if we send null we might need to handle it or clear it in DB.
        // For now, let's assume valid selection is needed.
        if (res.success) {
            loadData();
        } else {
            alert('Error: ' + res.error);
        }
    } catch (e: any) {
        alert('Exception: ' + e.message);
    }
    setSaving(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href={`/profile/leagues/${leagueId}/telemetry`} className="btn-secondary btn-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                HUB
            </Link>
            <span className="text-f1" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>SESSION MANAGEMENT</span>
        </div>
        <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>DRIVER MAPPING</h1>
        <p style={{ color: 'var(--silver)' }}>Assign in-game names to official league participants for session #{sessionId.slice(0,8)}</p>
      </header>

      <div className="f1-card p-0 overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th className="text-f1" style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.7rem' }}>POS</th>
              <th className="text-f1" style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.7rem' }}>IN-GAME NAME (TELEMETRY)</th>
              <th className="text-f1" style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.7rem' }}>ASSIGNED LEAGUE DRIVER</th>
              <th className="text-f1" style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.7rem' }}>BEST LAP</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const isAssigned = !!p.driver_id;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '15px 20px' }}>
                    <div className="text-f1" style={{ fontSize: '1.2rem', opacity: 0.5 }}>{p.position}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div className="flex flex-col">
                        <span className="text-f1" style={{ color: p.is_human ? 'var(--f1-red)' : 'var(--silver)' }}>{p.gameName}</span>
                        {!p.is_human && <span style={{ fontSize: '0.6rem', color: 'var(--silver)', opacity: 0.4 }}>AI CONSTRUCT</span>}
                    </div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div className="flex items-center gap-2">
                        <select 
                            className="glass-input"
                            style={{ padding: '5px 10px', fontSize: '0.8rem', width: '200px' }}
                            value={p.driver_id || ''}
                            onChange={(e) => handleAssign(p.gameName, e.target.value)}
                            disabled={saving === p.gameName}
                        >
                            <option value="">- Select Driver -</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                        {saving === p.gameName && <span className="animate-pulse" style={{ fontSize: '0.8rem' }}>SYNCING...</span>}
                        {isAssigned && <span style={{ color: 'var(--f1-green)' }}>✅</span>}
                    </div>
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                    <div className="text-mono" style={{ fontSize: '0.8rem' }}>
                        {p.fastest_lap_ms ? `${(p.fastest_lap_ms / 1000).toFixed(3)}s` : '--:--:---'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

        <div className="mt-8 flex justify-end gap-small">
            <Link href={`/profile/analysis/${sessionId}`} className="btn-secondary btn-sm" style={{ padding: '12px 24px' }}>
                OPEN DEEP DIVE
            </Link>
        </div>
    </div>
  );
}
