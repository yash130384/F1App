'use client';

import { useState } from 'react';
import { adminLogin, saveRaceResults } from '@/lib/actions';
import { calculatePoints } from '@/lib/scoring';
import { F1_TRACKS_2025 } from '@/lib/constants';

export default function AdminUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [extractedData, setExtractedData] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [track, setTrack] = useState('');
    const [leagueName, setLeagueName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/extract-results', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setExtractedData(data.rankings);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Auth check and fetch drivers via Server Action
            const authRes = await adminLogin(leagueName, adminPassword);

            if (!authRes.success || !authRes.leagueId) {
                throw new Error(authRes.error || 'Invalid League Name or Admin Password.');
            }

            // 2. Process rankings and link to existing drivers
            const drivers = authRes.drivers || [];
            const resultsToInsert = extractedData!.map(item => {
                const driver = drivers.find((d: any) => d.name.toLowerCase().includes(item.name.toLowerCase()));
                if (!driver) return null;

                return {
                    driver_id: driver.id,
                    position: item.position,
                    fastest_lap: item.fastest_lap,
                    clean_driver: item.clean_driver
                };
            }).filter(Boolean);

            if (resultsToInsert.length === 0) {
                throw new Error('No matching drivers found for the extracted names. Ensure drivers have joined the league.');
            }

            // 3. Save via Server Action
            const saveRes = await saveRaceResults(authRes.leagueId, track, resultsToInsert);

            if (saveRes.success) {
                alert('Race results saved successfully!');
                window.location.href = '/';
            } else {
                throw new Error(saveRes.error || 'Failed to save results.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '800px' }}>
            <h1 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>AI Race Extraction</h1>

            {!extractedData ? (
                <form onSubmit={handleUpload} className="f1-card flex flex-col gap-2">
                    <p style={{ color: 'var(--silver)' }}>Upload a screenshot of the race recap screen from F1 25.</p>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                    <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={loading || !file}>
                        {loading ? 'AI Extracting...' : 'Upload & Extract'}
                    </button>
                    {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
                </form>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="f1-card">
                        <h2 className="text-f1" style={{ marginBottom: '1rem' }}>Extracted Results</h2>
                        <div className="flex flex-col gap-1">
                            {extractedData.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                                    <span>{item.position}. <span className="text-f1">{item.name}</span></span>
                                    <div className="flex gap-2">
                                        {item.fastest_lap && <span style={{ color: 'var(--f1-red)', fontSize: '0.7rem', fontWeight: 900 }}>⚡ FASTEST</span>}
                                        {item.clean_driver && <span style={{ color: 'var(--success)', fontSize: '0.7rem', fontWeight: 900 }}>🛡️ CLEAN</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="f1-card" style={{ border: '2px solid var(--f1-red)', background: 'rgba(255, 24, 1, 0.02)' }}>
                        <h2 className="text-f1" style={{ color: 'var(--f1-red)', marginBottom: '1.5rem', letterSpacing: '1px' }}>CONFIRM & SAVE</h2>
                        <div className="input-group mb-4">
                            <label>RACE LOCATION / TRACK</label>
                            <select
                                value={track}
                                onChange={e => setTrack(e.target.value)}
                                style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white', width: '100%' }}
                            >
                                <option value="">-- Select Track --</option>
                                {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-2 gap-4 mb-6">
                            <div className="input-group">
                                <label>LEAGUE NAME</label>
                                <input
                                    type="text"
                                    placeholder="League Name"
                                    value={leagueName}
                                    onChange={e => setLeagueName(e.target.value)}
                                    style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white' }}
                                />
                            </div>
                            <div className="input-group">
                                <label>ADMIN PASSWORD</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white' }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleSave} className="btn-primary" style={{ height: '3.5rem', justifyContent: 'center', fontSize: '1rem' }} disabled={loading}>
                                {loading ? 'SAVING DATA...' : 'SUBMIT RACE RESULTS'}
                            </button>
                            <button onClick={() => setExtractedData(null)} className="btn-secondary" style={{ justifyContent: 'center', color: 'var(--silver)', background: 'transparent' }}>
                                &larr; CANCEL / RE-UPLOAD
                            </button>
                        </div>
                        {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
