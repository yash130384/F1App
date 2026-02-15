'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
    seedTestData,
    deleteRace,
    deleteScheduledRace,
    deleteDriver,
    adminLogin,
    getAllLeagues,
    getPointsConfig,
    updatePointsConfig,
    joinLeague,
    scheduleRace,
    getDashboardData,
    getRaceDetails,
    updateRaceResults
} from '@/lib/actions';
import { DEFAULT_CONFIG, PointsConfig, calculatePoints, formatPoints } from '@/lib/scoring';
import { F1_TRACKS_2025 } from '@/lib/constants';

export default function AdminHub() {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authType, setAuthType] = useState<'league' | null>(null);
    const [leagueName, setLeagueName] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [leagueId, setLeagueId] = useState<string | null>(null);

    // Dynamic Data State
    const [activeTab, setActiveTab] = useState<'races' | 'drivers' | 'points'>('races');
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [pointsConfig, setPointsConfig] = useState<PointsConfig>(DEFAULT_CONFIG);

    // UI State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newDriverName, setNewDriverName] = useState('');
    const [newDriverTeam, setNewDriverTeam] = useState('');
    const [scheduleTrack, setScheduleTrack] = useState(F1_TRACKS_2025[0]);
    const [scheduleDate, setScheduleDate] = useState('');
    const [upcomingRaces, setUpcomingRaces] = useState<any[]>([]);
    const [finishedRaces, setFinishedRaces] = useState<any[]>([]);

    // Edit State
    const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
    const [editingRaceTrack, setEditingRaceTrack] = useState('');
    const [editResults, setEditResults] = useState<any[]>([]);

    useEffect(() => {
        refreshLeagues();
        checkSession();
    }, []);

    const checkSession = async () => {
        const session = localStorage.getItem('f1_admin_session');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed.type === 'league') {
                    // Re-login to fetch fresh data
                    const res = await adminLogin(parsed.name, parsed.pass);
                    if (res.success) {
                        setIsLoggedIn(true);
                        setAuthType('league');
                        setLeagueName(parsed.name);
                        setAdminPass(parsed.pass); // keep pass for actions
                        setLeagueId(res.leagueId);
                        setDrivers(res.drivers || []);
                        setActiveTab('races');

                        const pRes = await getPointsConfig(res.leagueId);
                        if (pRes.success && pRes.config) setPointsConfig(pRes.config);

                        refreshRaces(res.leagueId);
                    } else {
                        localStorage.removeItem('f1_admin_session');
                    }
                }
            } catch (e) {
                console.error('Session parse error', e);
                localStorage.removeItem('f1_admin_session');
            }
        }
    };

    async function refreshRaces(lId: string) {
        const res = await getDashboardData(lId);
        if (res.success) {
            setUpcomingRaces(res.upcoming || []);
            setFinishedRaces(res.races || []);
        }
    }

    async function refreshLeagues() {
        const res = await getAllLeagues();
        if (res.success) setLeaguesList(res.leagues || []);
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // League Admin Check
        const res = await adminLogin(leagueName, adminPass);
        if (res.success) {
            setIsLoggedIn(true);
            setAuthType('league');
            setLeagueId(res.leagueId);
            setDrivers(res.drivers || []);
            setActiveTab('races');
            localStorage.setItem('f1_admin_session', JSON.stringify({ type: 'league', name: leagueName, pass: adminPass }));

            // Load points config
            const pRes = await getPointsConfig(res.leagueId);
            if (pRes.success && pRes.config) setPointsConfig(pRes.config);

            refreshRaces(res.leagueId);
        } else {
            alert(res.error || 'Login failed.');
        }
        setLoading(false);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setAuthType(null);
        setLeagueName('');
        setAdminPass('');
        setLeagueId(null);
        localStorage.removeItem('f1_admin_session');
    }

    const handleUpdatePoints = async () => {
        if (!leagueId) return;
        setSubmitting(true);
        const res = await updatePointsConfig(leagueId, pointsConfig, adminPass);
        if (res.success) {
            alert('Points configuration updated!');
        } else {
            alert('Failed to update points: ' + res.error);
        }
        setSubmitting(false);
    };

    const handleAddDriver = async () => {
        if (!leagueName || !newDriverName) return;
        setSubmitting(true);
        // Using a join pass isn't strictly needed for admin add, but the action requires it
        // We fetching it or just pass "admin_add" if we modified the action, but safer to just use one that exists
        const res = await joinLeague(leagueName, 'any', newDriverName, newDriverTeam);
        if (res.success) {
            // Refresh drivers list
            const authRes = await adminLogin(leagueName, adminPass);
            if (authRes.success) setDrivers(authRes.drivers || []);
            setNewDriverName('');
            setNewDriverTeam('');
        } else {
            alert('Failed to add driver: ' + res.error);
        }
        setSubmitting(false);
    };

    const handleDeleteDriver = async (id: string) => {
        if (!leagueId || !confirm('Are you sure you want to delete this driver?')) return;
        const res = await deleteDriver(id, leagueId, adminPass);
        if (res.success) {
            setDrivers(prev => prev.filter(d => d.id !== id));
        } else {
            alert('Error: ' + res.error);
        }
    };

    const handleDeleteRace = async (id: string, track: string) => {
        if (!leagueId || !confirm(`Are you sure you want to delete the race at ${track}? This will recalculate all standings.`)) return;
        const res = await deleteRace(id, leagueId, adminPass);
        if (res.success) {
            refreshRaces(leagueId);
        } else {
            alert('Error: ' + res.error);
        }
    };

    const handleDeleteScheduledRace = async (id: string, track: string) => {
        if (!leagueId || !confirm(`Are you sure you want to delete the scheduled race at ${track}?`)) return;
        const res = await deleteScheduledRace(id, leagueId, adminPass);
        if (res.success) {
            refreshRaces(leagueId);
        } else {
            alert('Error: ' + res.error);
        }
    };

    const handleScheduleRace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leagueId || !scheduleDate) return;
        setSubmitting(true);

        const res = await scheduleRace(leagueId, scheduleTrack, scheduleDate, adminPass);
        if (res.success) {
            alert('Race Scheduled!');
            setScheduleDate('');
            refreshRaces(leagueId);
        } else {
            alert('Error: ' + res.error);
        }
        setSubmitting(false);
    };

    const handleStartEdit = async (raceId: string, track: string) => {
        setLoading(true);
        const res = await getRaceDetails(raceId);
        if (res.success) {
            setEditingRaceId(raceId);
            setEditingRaceTrack(track);
            // Ensure data structure is compatible with our update function
            setEditResults(res.results || []);
        } else {
            alert('Error fetching race details: ' + res.error);
        }
        setLoading(false);
    };

    const handleUpdateEditResult = (driverId: string, field: string, value: any) => {
        setEditResults(prev => prev.map(res =>
            res.driver_id === driverId ? { ...res, [field]: value } : res
        ));
    };

    const handleSaveEdit = async () => {
        if (!leagueId || !editingRaceId) return;
        setSubmitting(true);
        const res = await updateRaceResults(leagueId, editingRaceId, editResults, adminPass);
        if (res.success) {
            alert('Race results updated!');
            setEditingRaceId(null);
            refreshRaces(leagueId);
        } else {
            alert('Error updating race: ' + res.error);
        }
        setSubmitting(false);
    };

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: 'url("/assets/login-bg.jpg")', backgroundColor: '#111' }}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
                <div className="relative z-10 f1-card animate-scale-in" style={{ maxWidth: '450px', width: '100%', padding: '3rem', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div className="text-center mb-8">
                        <h1 className="text-f1 text-gradient mb-2" style={{ fontSize: '2.5rem', lineHeight: 1 }}>ADMIN ACCESS</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--silver)', letterSpacing: '3px', fontWeight: 700 }}>RESTRICTED AREA</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--silver)', letterSpacing: '1px' }}>SELECT LEAGUE</label>
                            <select
                                value={leagueName}
                                onChange={e => setLeagueName(e.target.value)}
                                required
                                style={{
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>Select your league...</option>
                                {leaguesList.map(l => (
                                    <option key={l.id} value={l.name} style={{ color: 'black' }}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--silver)', letterSpacing: '1px' }}>PASSWORD</label>
                            <input
                                type="password"
                                value={adminPass}
                                onChange={e => setAdminPass(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-primary mt-4"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '1rem',
                                fontSize: '1rem',
                                letterSpacing: '2px'
                            }}
                            disabled={loading}
                        >
                            {loading ? 'VERIFYING...' : 'ENTER HUB'}
                        </button>
                    </form>

                    <div className="text-center mt-8 pt-6 border-t border-white/10">
                        <Link href="/" className="hover:text-f1-red transition-colors" style={{ fontSize: '0.75rem', color: 'var(--silver)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span>&larr;</span> RETURN TO DASHBOARD
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8 animate-fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem', letterSpacing: '-2px', marginBottom: '0.5rem' }}>ADMIN HUB</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="status-badge badge-silver" style={{ padding: '6px 16px', borderRadius: '4px', fontSize: '0.7rem', letterSpacing: '2px' }}>
                            {`${leagueName.toUpperCase()} ADMIN`}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary"
                            style={{
                                fontSize: '0.65rem',
                                padding: '6px 14px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,10,10,0.1)',
                                color: 'var(--f1-red)',
                                fontWeight: 900,
                                letterSpacing: '1px'
                            }}
                        >
                            SIGN OUT
                        </button>
                    </div>
                </div>

                <nav className="f1-tabs flex">
                    <button className={activeTab === 'races' ? 'active' : ''} onClick={() => setActiveTab('races')}>RACE MANAGEMENT</button>
                    <button className={activeTab === 'drivers' ? 'active' : ''} onClick={() => setActiveTab('drivers')}>DRIVERS</button>
                    <button className={activeTab === 'points' ? 'active' : ''} onClick={() => setActiveTab('points')}>POINTS</button>
                </nav>
            </header>

            <main>
                {/* RACE ENTRY TAB */}
                {activeTab === 'races' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                        {editingRaceId ? (
                            <div className="flex flex-col gap-6">
                                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                    <div>
                                        <h2 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', letterSpacing: '-2px' }}>EDIT RESULTS</h2>
                                        <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>Update positions and bonuses for this race.</p>
                                    </div>
                                    <div className="flex flex-col gap-2" style={{ minWidth: '300px' }}>
                                        <label style={{ color: 'var(--f1-red)', fontSize: '0.7rem', fontWeight: 900 }}>RACE LOCATION (READ-ONLY)</label>
                                        <input
                                            value={editingRaceTrack}
                                            disabled
                                            style={{
                                                padding: '0.8rem',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '4px',
                                                color: 'var(--silver)',
                                                width: '100%',
                                                cursor: 'not-allowed',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </div>
                                </header>

                                <div className="flex flex-col gap-3">
                                    {editResults.sort((a, b) => a.position - b.position).map((res) => (
                                        <div key={res.driver_id} className="f1-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ padding: '1.2rem 1.5rem', borderLeft: '4px solid var(--f1-red)' }}>
                                            <div>
                                                <span className="text-f1" style={{ fontSize: '1.1rem' }}>{res.driver_name}</span>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>Position in standings updated automatically</div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)' }}>P</span>
                                                    <input
                                                        type="number"
                                                        min="1" max="25"
                                                        value={res.position}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'position', parseInt(e.target.value))}
                                                        style={{ width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textAlign: 'center', fontWeight: 'bold' }}
                                                    />
                                                </div>

                                                <label className="checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!res.fastest_lap}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'fastest_lap', e.target.checked)}
                                                    />
                                                    <span className="checkmark fastest"></span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>FL</span>
                                                </label>

                                                <label className="checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!res.clean_driver}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'clean_driver', e.target.checked)}
                                                    />
                                                    <span className="checkmark clean"></span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>CD</span>
                                                </label>

                                                <label className="checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!res.is_dnf}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'is_dnf', e.target.checked)}
                                                    />
                                                    <span className="checkmark dnf"></span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>DNF</span>
                                                </label>

                                                <div style={{ minWidth: '90px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: 'var(--white)' }}>
                                                    {formatPoints(calculatePoints({ position: res.position, fastestLap: res.fastest_lap, cleanDriver: res.clean_driver, isDnf: res.is_dnf }))} <span style={{ fontSize: '0.6rem', color: 'var(--silver)' }}>PTS</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={submitting}
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: 'center', height: '4rem', fontSize: '1.2rem' }}
                                    >
                                        {submitting ? 'UPDATING...' : 'SAVE CHANGES'}
                                    </button>
                                    <button
                                        onClick={() => setEditingRaceId(null)}
                                        className="btn-secondary"
                                        style={{ padding: '0 2rem' }}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                <div className="f1-card hover-f1 flex flex-col gap-4">
                                    <h2 className="text-f1">MANUAL ENTRY</h2>
                                    <p style={{ color: 'var(--silver)', fontSize: '0.9rem', marginBottom: '1rem' }}>Quickly enter results by hand for maximum control.</p>
                                    <Link href="/admin/results" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>MANUAL INPUT</Link>
                                </div>

                                <div className="f1-card hover-f1" style={{ gridColumn: 'span 2' }}>
                                    <h2 className="text-f1 mb-4">RACE PLANNER</h2>
                                    <p className="mb-4" style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>Schedule upcoming races for your league.</p>
                                    <form onSubmit={handleScheduleRace} className="grid grid-3 gap-4 items-end mb-8">
                                        <div className="input-group">
                                            <label>SELECT TRACK</label>
                                            <select
                                                value={scheduleTrack}
                                                onChange={e => setScheduleTrack(e.target.value)}
                                                style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                            >
                                                {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>DATE & TIME</label>
                                            <input
                                                type="datetime-local"
                                                value={scheduleDate}
                                                onChange={e => setScheduleDate(e.target.value)}
                                                required
                                                style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                                            />
                                        </div>
                                        <button type="submit" disabled={submitting} className="btn-primary" style={{ height: '46px', justifyContent: 'center' }}>
                                            {submitting ? 'SCHEDULING...' : 'SCHEDULE EVENT'}
                                        </button>
                                    </form>

                                    <div className="grid grid-2 gap-8">
                                        <div>
                                            <h3 className="text-f1 mb-4" style={{ fontSize: '0.9rem', color: 'var(--f1-red)' }}>UPCOMING RACES</h3>
                                            <div className="flex flex-col gap-2">
                                                {upcomingRaces.map(r => (
                                                    <div key={r.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                                                        <div>
                                                            <div className="text-f1" style={{ fontSize: '0.8rem' }}>{r.track}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>{new Date(r.scheduled_date || '').toLocaleString()}</div>
                                                        </div>
                                                        <button onClick={() => handleDeleteScheduledRace(r.id, r.track)} className="btn-danger-text">CANCEL</button>
                                                    </div>
                                                ))}
                                                {upcomingRaces.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>No races scheduled.</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-f1 mb-4" style={{ fontSize: '0.9rem' }}>FINISHED RACES</h3>
                                            <div className="flex flex-col gap-2">
                                                {finishedRaces.map(r => (
                                                    <div key={r.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                                                        <div>
                                                            <div className="text-f1" style={{ fontSize: '0.8rem' }}>{r.track}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>{new Date(r.race_date || '').toLocaleDateString()}</div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleStartEdit(r.id, r.track)} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.65rem' }}>EDIT</button>
                                                            <button onClick={() => handleDeleteRace(r.id, r.track)} className="btn-danger-text">DELETE</button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {finishedRaces.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>No finished races yet.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* DRIVERS TAB */}
                {activeTab === 'drivers' && (
                    <div className="grid grid-2 gap-8 animate-fade-in">
                        <div className="f1-card">
                            <h2 className="text-f1 mb-4">DRIVERS LIST</h2>
                            <div className="flex flex-col gap-2">
                                {drivers.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                                        <div>
                                            <div className="text-f1" style={{ fontSize: '1rem' }}>{d.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>{d.team || 'Independent'}</div>
                                        </div>
                                        <button onClick={() => handleDeleteDriver(d.id)} className="btn-danger-text">REMOVE</button>
                                    </div>
                                ))}
                                {drivers.length === 0 && <p className="text-center py-4" style={{ color: 'var(--silver)' }}>No drivers registered yet.</p>}
                            </div>
                        </div>

                        <div className="f1-card">
                            <h2 className="text-f1 mb-4">ADD NEW DRIVER</h2>
                            <div className="flex flex-col gap-3">
                                <div className="input-group">
                                    <label>FULL NAME</label>
                                    <input value={newDriverName} onChange={e => setNewDriverName(e.target.value)} placeholder="Max Mustermann" />
                                </div>
                                <div className="input-group">
                                    <label>TEAM CONSTRUCTOR</label>
                                    <input value={newDriverTeam} onChange={e => setNewDriverTeam(e.target.value)} placeholder="Mercedes-AMG / Privateer" />
                                </div>
                                <button onClick={handleAddDriver} disabled={submitting || !newDriverName} className="btn-primary mt-2">
                                    {submitting ? 'ADDING...' : 'ADD TO LEAGUE'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* POINTS CONFIG TAB */}
                {activeTab === 'points' && (
                    <div className="f1-card animate-fade-in">
                        <h2 className="text-f1 mb-6">POINTS CONFIGURATION</h2>

                        <div className="grid grid-3 gap-6 mb-8">
                            <div className="input-group">
                                <label>FASTEST LAP BONUS</label>
                                <input
                                    type="number"
                                    value={pointsConfig.fastestLapBonus}
                                    onChange={e => setPointsConfig({ ...pointsConfig, fastestLapBonus: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="input-group">
                                <label>CLEAN DRIVER BONUS</label>
                                <input
                                    type="number"
                                    value={pointsConfig.cleanDriverBonus}
                                    onChange={e => setPointsConfig({ ...pointsConfig, cleanDriverBonus: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <h3 className="text-f1 mb-4" style={{ fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>POSITION POINTS</h3>
                        <div className="grid grid-4 gap-x-8 gap-y-4 mb-8">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div key={i + 1} className="flex items-center gap-3">
                                    <span style={{ width: '30px', fontWeight: '900', color: 'var(--silver)', opacity: 0.5 }}>{i + 1}.</span>
                                    <input
                                        type="number"
                                        value={pointsConfig.points[i + 1] || 0}
                                        onChange={e => {
                                            const newPoints = { ...pointsConfig.points, [i + 1]: parseInt(e.target.value) || 0 };
                                            setPointsConfig({ ...pointsConfig, points: newPoints });
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button onClick={handleUpdatePoints} disabled={submitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {submitting ? 'SAVING CONFIG...' : 'SAVE POINTS SETTINGS'}
                        </button>
                    </div>
                )}

            </main>

            <style jsx global>{`
                .min-vh-100 { min-height: 100vh; }
                .text-center { text-align: center; }
                .grid { display: grid; }
                .grid-2 { grid-template-columns: 1fr 1fr; }
                .grid-3 { grid-template-columns: repeat(3, 1fr); }
                .grid-4 { grid-template-columns: repeat(4, 1fr); }
                @media (max-width: 768px) {
                    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
                }
                
                .f1-tabs {
                    background: var(--f1-carbon-dark);
                    padding: 0.3rem;
                    border-radius: 8px;
                    border: 1px solid var(--glass-border);
                }
                .f1-tabs button {
                    padding: 0.6rem 1.2rem;
                    border: none;
                    background: transparent;
                    color: var(--silver);
                    font-family: 'F1-Wide', sans-serif;
                    font-size: 0.6rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-radius: 6px;
                }
                .f1-tabs button.active {
                    background: var(--f1-red);
                    color: white;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .input-group label {
                    font-size: 0.6rem;
                    color: var(--silver);
                    font-weight: 900;
                    letter-spacing: 1px;
                }
                .input-group input {
                    padding: 0.8rem;
                    background: var(--f1-carbon-dark);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    color: white;
                    font-size: 0.9rem;
                    transition: border-color 0.2s;
                }
                .input-group input:focus {
                    outline: none;
                    border-color: var(--f1-red);
                }

                .status-badge {
                    font-size: 0.6rem;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: 900;
                    letter-spacing: 1px;
                }
                .badge-red { background: var(--f1-red); color: white; }
                .badge-silver { background: var(--silver); color: black; }

                .btn-text {
                    background: none;
                    border: none;
                    color: var(--silver);
                    cursor: pointer;
                    text-decoration: underline;
                }

                .btn-danger-text {
                    color: var(--f1-red);
                    background: none;
                    border: none;
                    font-size: 0.7rem;
                    font-weight: 900;
                    cursor: pointer;
                    letter-spacing: 1px;
                }
                .btn-danger-text:hover { opacity: 0.7; }

                .animate-scale-in {
                    animation: scaleIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
