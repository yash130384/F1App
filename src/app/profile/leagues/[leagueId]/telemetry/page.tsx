'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getTelemetrySessionsForLeague, getUnassignedTelemetrySessions, linkTelemetryToRace, deleteTelemetrySession, getLeagueRaces } from '@/lib/actions';
import { getTrackNameById, F1_TRACKS_2025 } from '@/lib/constants';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import Link from 'next/link';

const SESSION_TYPES: Record<string, string> = {
  'Race': '🏁 Rennen',
  'Race 2': '🏁 Rennen 2',
  'Race 3': '🏁 Rennen 3',
  'Qualifying 1': '⏱ Qualifying 1',
  'Qualifying 2': '⏱ Qualifying 2',
  'Qualifying 3': '⏱ Qualifying 3',
  'Short Qualifying': '⏱ Short Qualifying',
  'One-Shot Qualifying': '⏱ One-Shot Qualifying',
  'Practice 1': '🔧 Training 1',
  'Practice 2': '🔧 Training 2',
  'Practice 3': '🔧 Training 3',
  'Short Practice': '🔧 Kurztraining',
  'Sprint Shootout 1': '⚡ Sprint Shootout 1',
  'Sprint Shootout 2': '⚡ Sprint Shootout 2',
  'Sprint Shootout 3': '⚡ Sprint Shootout 3',
  'Time Trial': '⏱ Zeitrennen',
  'bin_upload': '📂 Bin Upload',
  'Unknown': '❓ Unbekannt',
};

function formatSessionType(type: string | number | null): string {
  if (type === null || type === undefined) return '❓ Unbekannt';
  const key = String(type);
  return SESSION_TYPES[key] ?? `📡 ${key}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  // SQLite gibt "YYYY-MM-DD HH:MM:SS" zurück – ISO-format für Date-Parser erzwingen
  const iso = dateStr.replace(' ', 'T') + (dateStr.includes('T') ? '' : 'Z');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function SessionCard({ s, leagueId, races, onLink, linking, onDelete }: {
  s: any; leagueId?: string; races?: any[]; onLink?: (sessionId: string, raceId: string) => void; linking?: string | null; onDelete?: (id: string) => void;
}) {
  const [editTrack, setEditTrack] = useState(s.track_id ?? '');
  const [editType, setEditType] = useState(s.session_type ?? '');
  const [selectedRace, setSelectedRace] = useState('');
  const [saving, setSaving] = useState(false);

  const trackName = (editTrack !== '' && editTrack !== null)
    ? getTrackNameById(Number(editTrack))
    : '— Strecke unbekannt —';

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/telemetry/session-meta', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: s.id, trackId: Number(editTrack), sessionType: editType }),
    });
    setSaving(false);
  };

  return (
    <div style={{
      background: 'var(--surface-mid)',
      borderRadius: '4px',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '1rem',
      borderLeft: '2px solid var(--f1-red)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: '3px',
            color: 'var(--text-secondary)',
          }}>#{s.id.slice(0, 8)}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
            {trackName}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {/* Session Type Dropdown */}
          <select
            value={editType}
            onChange={e => setEditType(e.target.value)}
            style={{
              background: 'var(--surface-high)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              padding: '0.3rem 0.5rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            <option value="">— Art wählen —</option>
            {Object.entries(SESSION_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {/* Track Dropdown */}
          <select
            value={editTrack}
            onChange={e => setEditTrack(e.target.value)}
            style={{
              background: 'var(--surface-high)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              padding: '0.3rem 0.5rem',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              flex: 1,
              minWidth: '180px',
            }}
          >
            <option value="">— Strecke wählen —</option>
            {Object.entries(F1_TRACKS_2025).map(([idx, name]) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-secondary btn-xs"
            style={{ whiteSpace: 'nowrap' }}
          >
            {saving ? '...' : '✓ Speichern'}
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          📅 {formatDate(s.created_at)}
          {s.track_length ? ` · ${(s.track_length / 1000).toFixed(3)} km` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', flexShrink: 0 }}>
        {leagueId && (
          <Link href={`/profile/leagues/${leagueId}/telemetry/${s.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.6rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        )}

        {onLink && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <select
              value={selectedRace}
              onChange={e => setSelectedRace(e.target.value)}
              style={{
                background: 'var(--surface-high)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '3px',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                padding: '0.2rem 0.4rem',
                fontFamily: 'var(--font-body)',
                minWidth: '130px'
              }}
            >
              <option value="">— Rennen auswählen —</option>
              {races?.map(r => (
                <option key={r.id} value={r.id}>{r.track} (Runde {r.round || '-'})</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              disabled={linking === s.id}
              onClick={() => {
                if (!selectedRace) {
                  alert("Bitte wähle zuerst links oder oben ein zugewiesenes Rennen aus der Dropdown-Liste aus!");
                  return;
                }
                onLink(s.id, selectedRace);
              }}
              style={{ whiteSpace: 'nowrap', width: '100%', padding: '0.3rem 0', opacity: (!selectedRace || linking === s.id) ? 0.5 : 1, cursor: (!selectedRace || linking === s.id) ? 'not-allowed' : 'pointer' }}
            >
              {linking === s.id ? 'Lädt...' : 'ZUORDNEN ✓'}
            </button>
          </div>
        )}

        {onDelete && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onDelete(s.id)}
            style={{ color: 'var(--f1-red)', border: '1px solid rgba(255,24,1,0.3)', background: 'transparent' }}
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}

export default function TelemetryHubPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [sessions, setSessions] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sessRes, unRes, racesRes] = await Promise.all([
      getTelemetrySessionsForLeague(leagueId),
      getUnassignedTelemetrySessions(leagueId),
      getLeagueRaces(leagueId)
    ]);
    if (sessRes.success) setSessions(sessRes.sessions || []);
    if (unRes.success) setUnassigned(unRes.sessions || []);
    if (racesRes.success) setRaces(racesRes.races || []);
    if (!sessRes.success || !unRes.success || !racesRes.success) {
      setError(sessRes.error || unRes.error || racesRes.error || 'Fehler beim Laden.');
    }
    setLoading(false);
  }, [leagueId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLink = async (sessionId: string, raceId: string) => {
    setLinking(sessionId);
    const res = await linkTelemetryToRace(sessionId, raceId);
    res.success ? loadData() : alert('Fehler: ' + res.error);
    setLinking(null);
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Diese Telemetrie-Session wirklich löschen?')) return;
    
    // Optimistic Update um Caching-Probleme des Client Routers zu umgehen
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setUnassigned(prev => prev.filter(s => s.id !== sessionId));

    const res = await deleteTelemetrySession(sessionId);
    if (!res.success) {
      alert(res.error || 'Fehler beim Löschen');
      loadData(); // Fallback wenn Löschen fehlschlägt
    }
  };

  if (loading && sessions.length === 0) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Link href={`/profile/leagues/${leagueId}`} className="btn btn-secondary btn-sm">
            ← BACK
          </Link>
          <span style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            ADMINISTRATION
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '3rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>
          TELEMETRY <span style={{ color: 'var(--f1-red)' }}>HUB</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Aufzeichnungen verwalten und Strecke/Art nachträglich setzen.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* Assigned Sessions */}
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Rennen zugewiesen ({sessions.length})
          </h2>
          {sessions.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-mid)', borderRadius: '4px' }}>
              Noch keine Sessions einem Rennergebnis zugewiesen.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map(s => <SessionCard key={s.id} s={s} leagueId={leagueId} onDelete={handleDelete} />)}
            </div>
          )}
        </section>

        {/* Unassigned */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
              Freie Uploads / Ungebunden ({unassigned.length})
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--f1-red)', border: '1px solid var(--f1-red)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
              LIVE NODE ACTIVE
            </span>
          </div>
          {unassigned.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              Keine unzugewiesenen Sessions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {unassigned.map(s => (
                <SessionCard key={s.id} s={s} races={races} onLink={handleLink} linking={linking} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
