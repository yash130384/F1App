'use client';

import { useState, useEffect } from 'react';
import { getAdminLeagueDrivers, saveRaceResults } from '@/lib/actions';
import { calculatePoints, formatPoints } from '@/lib/scoring';
import { F1_TRACKS_2025 } from '@/lib/constants';

export default function ManualResults({ params }: { params: { leagueId: string } }) {
    const leagueId = params.leagueId;
    const [drivers, setDrivers] = useState<any[]>([]);
    const [track, setTrack] = useState('');
    const [results, setResults] = useState<Record<string, { position: number; qualiPosition: number; fastestLap: boolean; cleanDriver: boolean; isDnf: boolean }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDrivers() {
            setLoading(true);
            try {
                const res = await getAdminLeagueDrivers(leagueId);
                if (res.success) {
                    setDrivers(res.drivers || []);
                    
                    const initialResults: any = {};
                    (res.drivers || []).forEach((d: any) => {
                        initialResults[d.id] = { position: 20, qualiPosition: 0, fastestLap: false, cleanDriver: false, isDnf: false };
                    });
                    setResults(initialResults);
                } else {
                    setError(res.error || "Failed to load drivers");
                }
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }
        
        fetchDrivers();
    }, [leagueId]);

    const updateResult = (driverId: string, field: string, value: any) => {
        setResults(prev => ({
            ...prev,
            [driverId]: { ...prev[driverId], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        if (!leagueId || !track) {
            alert("Please select a track before submitting.");
            return;
        }
        
        setLoading(true);
        setError(null);

        const formattedResults = drivers.map(d => ({
            driver_id: d.id,
            position: results[d.id].position,
            quali_position: results[d.id].qualiPosition,
            fastest_lap: results[d.id].fastestLap,
            clean_driver: results[d.id].cleanDriver,
            is_dnf: results[d.id].isDnf
        }));

        const res = await saveRaceResults(leagueId, track, formattedResults);

        if (res.success) {
            alert('Race Results Submitted!');
            window.location.href = `/profile/leagues/${leagueId}`;
        } else {
            setError(res.error || 'Failed to save results.');
            setLoading(false);
        }
    };

    if (loading && drivers.length === 0) {
        return (
            <div className="flex items-center justify-center min-vh-100">
                <div className="text-center">
                    <div className="text-f1 animate-pulse" style={{ fontSize: '1.5rem' }}>LOADING LEAGUE DATA...</div>
                </div>
            </div>
        );
    }
    
    if (error && drivers.length === 0) {
        return (
            <div className="flex items-center justify-center min-vh-100">
                <div className="text-center f1-card" style={{ padding: '2rem' }}>
                    <div className="text-f1 text-gradient" style={{ fontSize: '1.5rem' }}>ACCESS DENIED</div>
                    <div style={{ color: 'var(--error)', marginTop: '1rem' }}>{error}</div>
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
                        disabled={loading}
                    >
                        <option value="">-- Select Track --</option>
                        {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </header>

            {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}

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

                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)' }}>Q P</span>
                                <input
                                    type="number"
                                    min="0" max="20"
                                    value={results[driver.id]?.qualiPosition}
                                    onChange={e => updateResult(driver.id, 'qualiPosition', parseInt(e.target.value))}
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

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={results[driver.id]?.isDnf}
                                    onChange={e => updateResult(driver.id, 'isDnf', e.target.checked)}
                                />
                                <span className="checkmark dnf"></span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>DNF</span>
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
