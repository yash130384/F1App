'use client';

import { useState } from 'react';
import { adminLogin, saveRaceResults } from '@/lib/actions';
import { calculatePoints, formatPoints } from '@/lib/scoring';
import { F1_TRACKS_2025 } from '@/lib/constants';

export default function AdminResults() {
    const [auth, setAuth] = useState({ name: '', pass: '' });
    const [isAuthed, setIsAuthed] = useState(false);
    const [leagueId, setLeagueId] = useState<string | null>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [track, setTrack] = useState('');
    const [results, setResults] = useState<Record<string, { position: number; fastestLap: boolean; cleanDriver: boolean }>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await adminLogin(auth.name, auth.pass);

        if (res.success) {
            setLeagueId(res.leagueId);
            setDrivers(res.drivers || []);
            setIsAuthed(true);

            // Initialize results state
            const initialResults: any = {};
            (res.drivers || []).forEach((d: any) => {
                initialResults[d.id] = { position: 20, fastestLap: false, cleanDriver: false };
            });
            setResults(initialResults);
            setLoading(false);
        } else {
            setError(res.error || 'Login failed.');
            setLoading(false);
        }
    };

    const updateResult = (driverId: string, field: string, value: any) => {
        setResults(prev => ({
            ...prev,
            [driverId]: { ...prev[driverId], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        if (!leagueId) return;
        setLoading(true);
        setError(null);

        const formattedResults = drivers.map(d => ({
            driver_id: d.id,
            position: results[d.id].position,
            fastest_lap: results[d.id].fastestLap,
            clean_driver: results[d.id].cleanDriver
        }));

        const res = await saveRaceResults(leagueId, track, formattedResults);

        if (res.success) {
            alert('Race Results Submitted!');
            window.location.href = '/';
        } else {
            setError(res.error || 'Failed to save results.');
            setLoading(false);
        }
    };

    if (!isAuthed) {
        return (
            <div className="container flex items-center justify-center min-vh-100">
                <div className="f1-card animate-scale-in" style={{ maxWidth: '450px', width: '100%', padding: '3.5rem 3rem', border: '1px solid var(--glass-border)', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
                    <div className="text-center mb-10">
                        <div className="text-f1 text-gradient mb-2" style={{ fontSize: '2.5rem', letterSpacing: '-2px' }}>ADMIN ACCESS</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--silver)', fontWeight: 900, letterSpacing: '5px', opacity: 0.8 }}>SYSTEM AUTHORIZATION</div>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-3">
                        <div className="input-group">
                            <label>LEAGUE NAME</label>
                            <input
                                value={auth.name}
                                onChange={e => setAuth({ ...auth, name: e.target.value })}
                                placeholder="e.g. My F1 League"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>PASSWORD</label>
                            <input
                                type="password"
                                value={auth.pass}
                                onChange={e => setAuth({ ...auth, pass: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}
                        <button type="submit" className="btn-primary mt-4" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'AUTHENTICATING...' : 'LOGIN TOHub'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem' }}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-f1 text-gradient" style={{ fontSize: '2.8rem', letterSpacing: '-2px' }}>MANUAL ENTRY</h1>
                    <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>Record positions and bonuses for all drivers.</p>
                </div>
                <div className="input-group" style={{ minWidth: '300px' }}>
                    <label style={{ color: 'var(--f1-red)' }}>RACE LOCATION / TRACK</label>
                    <select
                        value={track}
                        onChange={e => setTrack(e.target.value)}
                        style={{ padding: '0.8rem', border: '1px solid var(--f1-red)', background: 'rgba(255, 24, 1, 0.05)', borderRadius: '4px', color: 'white', width: '100%' }}
                    >
                        <option value="">-- Select Track --</option>
                        {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </header>

            <div className="flex flex-col gap-3">
                {drivers.map(driver => (
                    <div key={driver.id} className="f1-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ padding: '1.2rem 1.5rem' }}>
                        <div>
                            <span className="text-f1" style={{ fontSize: '1.1rem' }}>{driver.name}</span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>{driver.team || 'Privateer'}</div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)' }}>P</span>
                                <input
                                    type="number"
                                    min="1" max="20"
                                    value={results[driver.id]?.position}
                                    onChange={e => updateResult(driver.id, 'position', parseInt(e.target.value))}
                                    style={{ width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textAlign: 'center', fontWeight: 'bold' }}
                                />
                            </div>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={results[driver.id]?.fastestLap}
                                    onChange={e => updateResult(driver.id, 'fastestLap', e.target.checked)}
                                />
                                <span className="checkmark fastest"></span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>FL</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={results[driver.id]?.cleanDriver}
                                    onChange={e => updateResult(driver.id, 'cleanDriver', e.target.checked)}
                                />
                                <span className="checkmark clean"></span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>CD</span>
                            </label>

                            <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: 'var(--white)' }}>
                                {formatPoints(calculatePoints(results[driver.id]))} <span style={{ fontSize: '0.6rem', color: 'var(--silver)' }}>PTS</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSubmit} className="btn-primary" style={{ marginTop: '3rem', width: '100%', justifyContent: 'center', height: '4rem', fontSize: '1.2rem' }} disabled={loading}>
                {loading ? 'STORING LOGS...' : 'CONFIRM AND SUBMIT RESULTS'}
            </button>
        </div>
    );
}
