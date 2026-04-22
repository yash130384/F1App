'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TelemetryParser } from '@/lib/telemetry/parser';

type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'success' | 'error';

interface League {
  id: string;
  name: string;
}

export default function TelemetryUploadPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Admin-Ligen laden
  useEffect(() => {
    fetch('/api/telemetry/upload')
      .then(r => r.json())
      .then(data => {
        setLeagues(data.leagues || []);
        if (data.leagues?.length === 1) {
          setSelectedLeagueId(data.leagues[0].id);
        }
      })
      .catch(() => setLeagues([]))
      .finally(() => setLeaguesLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedLeagueId) return;

    try {
      // 1. Participants lokal parsen
      setStatus('parsing');
      setMessage('Teilnehmerliste wird gelesen...');

      const arrayBuffer = await file.arrayBuffer();
      const parser = new TelemetryParser(arrayBuffer, 6);
      const participants = parser.parseParticipantsOnly();
      const sessionInfo = parser.parseSessionInfoOnly();

      if (!participants) {
        throw new Error('Kein gültiger Participants-Packet gefunden. Ist dies eine F1 25 .bin Datei?');
      }

      const humanParticipants = participants.filter((p: any) => p.m_aiControlled === 0 && p.m_name?.trim());

      if (humanParticipants.length === 0) {
        throw new Error('Keine menschlichen Fahrer in der Datei gefunden.');
      }

      const allPackets = parser.parseAll();

      // 2. Payload an API schicken
      setStatus('uploading');
      setMessage(`${participants.length} Fahrer gefunden, davon ${humanParticipants.length} menschlich – wird gespeichert...`);

      const res = await fetch('/api/telemetry/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeagueId,
          fileName: file.name,
          fileSize: file.size,
          trackId: sessionInfo?.trackId,
          sessionType: sessionInfo?.sessionType,
          trackLength: sessionInfo?.trackLength,
          participants: humanParticipants.map((p: any) => ({
            name: p.m_name,
            teamId: p.m_teamId,
            raceNumber: p.m_raceNumber,
            carIndex: participants.findIndex((allp: any) => allp === p)
          })),
          telemetryData: allPackets
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Serverfehler' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setStatus('success');
      setMessage(`Session für „${leagues.find(l => l.id === selectedLeagueId)?.name}" gespeichert! (${participants.length} Fahrer und davon ${data.participantsCount} menschlich)`);
      setTimeout(() => router.push('/profile/analysis'), 2500);

    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Unbekannter Fehler');
    }
  };

  const isLoading = status === 'parsing' || status === 'uploading';
  const canUpload = !!file && !!selectedLeagueId && !isLoading;

  // Kein Admin einer Liga → Zugriff verweigern
  if (!leaguesLoading && leagues.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Kein Zugriff
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Du bist kein Administrator einer aktiven Liga. Nur Liga-Admins können Telemetrie-Dateien hochladen.
          </p>
          <Link href="/profile/analysis" className="btn btn-secondary">← Zurück</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <Link href="/profile/analysis" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
            ← Sessions
          </Link>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '2.5rem',
            textTransform: 'uppercase',
            letterSpacing: '-0.03em',
            fontStyle: 'italic',
            marginBottom: '0.5rem'
          }}>
            Telemetrie<span style={{ color: 'var(--f1-red)' }}> Upload</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Wähle eine Liga und eine F1 25 Telemetrie-Datei (.bin). Teilnehmerliste wird lokal extrahiert.
          </p>
        </div>

        <div className="f1-card" style={{ padding: '2rem', background: 'var(--surface-mid)' }}>

          {/* Liga-Dropdown */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
              marginBottom: '0.6rem',
            }}>
              Liga (Admin)
            </label>
            {leaguesLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.75rem 0' }}>Lade Ligen...</div>
            ) : (
              <select
                value={selectedLeagueId}
                onChange={e => setSelectedLeagueId(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface-high)',
                  border: `1px solid ${selectedLeagueId ? 'var(--f1-red)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: '4px',
                  color: selectedLeagueId ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <option value="" style={{ background: 'var(--surface-high)', color: 'var(--text-muted)' }}>
                  — Liga auswählen —
                </option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id} style={{ background: 'var(--surface-high)', color: 'var(--text-primary)' }}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Datei Drop-Zone */}
          <label
            htmlFor="telemetry-file-input"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '2.5rem 2rem',
              border: `2px dashed ${file ? 'var(--f1-red)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.2s ease',
              background: file ? 'rgba(255,24,1,0.04)' : 'transparent',
              marginBottom: '1.5rem',
              pointerEvents: isLoading ? 'none' : 'auto',
            }}
          >
            <span style={{ fontSize: '2rem' }}>📂</span>
            {file ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--f1-red)', fontSize: '0.9rem' }}>
                  {file.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {(file.size / 1024 / 1024).toFixed(0)} MB
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Datei auswählen</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  .bin — F1 25 Telemetrie-Aufzeichnung
                </div>
              </div>
            )}
            <input
              id="telemetry-file-input"
              type="file"
              accept=".bin"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </label>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="btn btn-primary"
            style={{
              width: '100%',
              opacity: !canUpload ? 0.4 : 1,
              cursor: !canUpload ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? message : 'Hochladen & Parsen'}
          </button>

          {/* Status Feedback */}
          {message && !isLoading && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              background: status === 'error' ? 'rgba(255,24,1,0.1)' : 'rgba(0,245,255,0.08)',
              border: `1px solid ${status === 'error' ? 'rgba(255,24,1,0.3)' : 'rgba(0,245,255,0.2)'}`,
              color: status === 'error' ? 'var(--f1-red)' : 'var(--f1-cyan)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Hinweis */}
        <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Hinweis:</strong> Nur Liga-Admins können Telemetrie hochladen. Die .bin-Datei wird nicht übertragen — nur die Teilnehmerliste wird lokal extrahiert und gespeichert. KI-Fahrzeuge werden automatisch herausgefiltert.
        </div>
      </div>
    </div>
  );
}
