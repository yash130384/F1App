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
    updateRaceResults,
    updateDriverGameName,
    updateDriverColor,
    getAllTelemetrySessions,
    deleteTelemetrySession,
    assignTelemetryPlayer,
    promoteTelemetryToRace,
    getTelemetrySessionDetails,
    adminAddDriver,
    getDiscoverableSessions,
    claimSession,
    adminAddTeam,
    adminDeleteTeam,
    getAllTeams,
    assignDriverToTeam,
    getAdminLeagueDrivers
} from '@/lib/actions';
import { DEFAULT_CONFIG, PointsConfig, calculatePoints, formatPoints } from '@/lib/scoring';
import { F1_TRACKS_2025, getTrackNameById } from '@/lib/constants';

export default function AdminHub() {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authType, setAuthType] = useState<'league' | null>(null);
    const [leagueName, setLeagueName] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [leagueId, setLeagueId] = useState<string | null>(null);

    // Dynamic Data State
    const [activeTab, setActiveTab] = useState<'races' | 'drivers' | 'points' | 'telemetry'>('races');
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [pointsConfig, setPointsConfig] = useState<PointsConfig>(DEFAULT_CONFIG);
    const [telemetrySessions, setTelemetrySessions] = useState<any[]>([]);
    const [discoverableSessions, setDiscoverableSessions] = useState<any[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newDriverName, setNewDriverName] = useState('');
    const [newDriverTeam, setNewDriverTeam] = useState('');
    const [newDriverColor, setNewDriverColor] = useState('#ffffff');
    const [newDriverGameName, setNewDriverGameName] = useState('');
    const [scheduleTrack, setScheduleTrack] = useState(F1_TRACKS_2025[0]);
    const [isRandomTrack, setIsRandomTrack] = useState(false);
    const [revealHours, setRevealHours] = useState(24);
    const [scheduleDate, setScheduleDate] = useState('');
    const [upcomingRaces, setUpcomingRaces] = useState<any[]>([]);
    const [finishedRaces, setFinishedRaces] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamColor, setNewTeamColor] = useState('#ff0000');

    // Edit State
    const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
    const [editingRaceTrack, setEditingRaceTrack] = useState('');
    const [editResults, setEditResults] = useState<any[]>([]);

    // Telemetry State
    const [managingSession, setManagingSession] = useState<any | null>(null);
    const [sessionParticipants, setSessionParticipants] = useState<any[]>([]);
    const [sessionPromoteTrack, setSessionPromoteTrack] = useState(F1_TRACKS_2025[0]);

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

                        const teamsRes = await getAllTeams(res.leagueId);
                        if (teamsRes.success) setTeams(teamsRes.teams || []);

                        refreshRaces(res.leagueId);
                        refreshTelemetry(res.leagueId, parsed.pass);
                    } else {
                        localStorage.removeItem('f1_admin_session');
                    }
                }
            } catch (error: any) { // Changed 'e' to 'error: any'
                console.error('Session parse error', error); // Changed 'e' to 'error'
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

    async function refreshTelemetry(lId: string, pass: string) {
        const res = await getAllTelemetrySessions(lId, pass);
        if (res.success) setTelemetrySessions(res.sessions || []);
        
        const dRes = await getDiscoverableSessions(lId, pass);
        if (dRes.success) setDiscoverableSessions(dRes.sessions || []);
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
            // Use getAdminLeagueDrivers to fetch drivers with team info
            const driversRes = await getAdminLeagueDrivers(res.leagueId, adminPass);
            if (driversRes.success) setDrivers(driversRes.drivers || []);
            setActiveTab('races');
            localStorage.setItem('f1_admin_session', JSON.stringify({ type: 'league', name: leagueName, pass: adminPass }));

            // Load points config
            const configRes = await getPointsConfig(res.leagueId);
            if (configRes.success && configRes.config) {
                setPointsConfig(configRes.config);
            }

            const teamsRes = await getAllTeams(res.leagueId);
            if (teamsRes.success) setTeams(teamsRes.teams || []);

            refreshRaces(res.leagueId);
            refreshTelemetry(res.leagueId, adminPass);
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

    const handleUpdatePointsConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leagueId || !adminPass || !pointsConfig) return;
        setSubmitting(true);
        const res = await updatePointsConfig(leagueId, pointsConfig, adminPass);
        if (res.success) alert('Config Updated!');
        else alert(res.error);
        setSubmitting(false);
    };

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leagueId || !newTeamName) return;
        setSubmitting(true);
        const res = await adminAddTeam(leagueId, adminPass, newTeamName, newTeamColor);
        if (res.success) {
            setNewTeamName('');
            const teamsRes = await getAllTeams(leagueId);
            if (teamsRes.success) setTeams(teamsRes.teams || []);
        } else alert(res.error);
        setSubmitting(false);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!leagueId || !adminPass) return;
        if (!confirm('Are you sure you want to delete this team? Drivers will be unassigned.')) return;
        const res = await adminDeleteTeam(leagueId, adminPass, teamId);
        if (res.success) {
            const teamsRes = await getAllTeams(leagueId);
            if (teamsRes.success) setTeams(teamsRes.teams || []);
            // Refresh drivers to show updated team_id
            const driversRes = await getAdminLeagueDrivers(leagueId, adminPass);
            if (driversRes.success) setDrivers(driversRes.drivers || []);
        } else alert(res.error);
    };

    const handleAssignTeam = async (driverId: string, teamId: string) => {
        if (!leagueId || !adminPass) return;
        const res = await assignDriverToTeam(leagueId, adminPass, driverId, teamId === 'NONE' ? null : teamId);
        if (res.success) {
            const driversRes = await getAdminLeagueDrivers(leagueId, adminPass);
            if (driversRes.success) setDrivers(driversRes.drivers || []);
        } else alert(res.error);
    };

    const handleAddDriver = async () => {
        if (!leagueId || !newDriverName) return;
        setSubmitting(true);
        const res = await adminAddDriver(leagueId, adminPass, newDriverName, newDriverTeam, newDriverColor, newDriverGameName);
        if (res.success) {
            // Refresh drivers list
            const authRes = await adminLogin(leagueName, adminPass);
            if (authRes.success) setDrivers(authRes.drivers || []);
            setNewDriverName('');
            setNewDriverTeam('');
            setNewDriverColor('#ffffff');
            setNewDriverGameName('');
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

    const handleUpdateGameName = async (driverId: string, gameName: string) => {
        if (!leagueId) return;
        setSubmitting(true);
        const res = await updateDriverGameName(driverId, leagueId, adminPass, gameName);
        if (!res.success) {
            alert('Error updating In-Game Name: ' + res.error);
        }
        setSubmitting(false);
    };

    const handleUpdateColor = async (driverId: string, color: string) => {
        if (!leagueId) return;
        setSubmitting(true);
        const res = await updateDriverColor(driverId, leagueId, adminPass, color);
        if (!res.success) {
            alert('Error updating Color: ' + res.error);
        }
        setSubmitting(false);
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

        const res = await scheduleRace(leagueId, scheduleTrack, scheduleDate, adminPass, isRandomTrack, revealHours);
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

    const handleDeleteTelemetry = async (sessionId: string) => {
        if (!leagueId || !confirm('Are you sure you want to delete this session?')) return;
        const res = await deleteTelemetrySession(sessionId, leagueId, adminPass);
        if (res.success) refreshTelemetry(leagueId, adminPass);
    };

    const handleManageTelemetry = async (sessionId: string) => {
        if (!leagueId) return;
        setLoading(true);
        const res = await getTelemetrySessionDetails(leagueId, adminPass, sessionId);
        if (res.success) {
            setManagingSession(res.session);
            setSessionParticipants(res.participants || []);
            setActiveTab('telemetry');
        } else {
            alert('Error fetching session details: ' + res.error);
        }
        setLoading(false);
    };

    const handleAssignTelemetryPlayer = async (gameName: string, selectedDriverId: string) => {
        if (!leagueId || !managingSession) return;
        setSubmitting(true);
        const res = await assignTelemetryPlayer(leagueId, adminPass, gameName, selectedDriverId);
        if (res.success) {
            // refresh this session
            handleManageTelemetry(managingSession.id);
            // also refresh drivers because game name updated there
            const authRes = await adminLogin(leagueName, adminPass);
            if (authRes.success) setDrivers(authRes.drivers || []);
        } else {
            alert('Error mapping player: ' + res.error);
        }
        setSubmitting(false);
    };

    const handlePromoteTelemetry = async () => {
        if (!leagueId || !managingSession) return;
        if (!sessionPromoteTrack) {
            alert('Please select a track.'); return;
        }
        setSubmitting(true);
        const res = await promoteTelemetryToRace(leagueId, adminPass, managingSession.id, sessionPromoteTrack);
        if (res.success) {
            alert('Session promoted to an Official Race!');
            setManagingSession(null);
            refreshRaces(leagueId);
            setActiveTab('races');
        } else {
            alert('Error promoting: ' + res.error);
        }
        setSubmitting(false);
    };

    const handleClaimSession = async (sessionId: string) => {
        if (!leagueId || !adminPass) return;
        setSubmitting(true);
        const res = await claimSession(leagueId, adminPass, sessionId);
        if (res.success) {
            alert('Session adopted successfully!');
            refreshTelemetry(leagueId, adminPass);
        } else {
            alert('Error adopting session: ' + res.error);
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

                <nav className="f1-tabs flex flex-wrap gap-2">
                    <button className={activeTab === 'races' ? 'active' : ''} onClick={() => setActiveTab('races')}>RACE MANAGEMENT</button>
                    <button className={activeTab === 'drivers' ? 'active' : ''} onClick={() => setActiveTab('drivers')}>DRIVERS</button>
                    <button className={activeTab === 'points' ? 'active' : ''} onClick={() => setActiveTab('points')}>POINTS</button>
                    <button className={activeTab === 'telemetry' ? 'active' : ''} onClick={() => { setActiveTab('telemetry'); setManagingSession(null); }}>TELEMETRY</button>
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

                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)' }}>Q P</span>
                                                    <input
                                                        type="number"
                                                        min="0" max="25"
                                                        value={res.quali_position || 0}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'quali_position', parseInt(e.target.value))}
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
                                                    {formatPoints(calculatePoints({ position: res.position, qualiPosition: res.quali_position || 0, fastestLap: res.fastest_lap, cleanDriver: res.clean_driver, isDnf: res.is_dnf }, pointsConfig))} <span style={{ fontSize: '0.6rem', color: 'var(--silver)' }}>PTS</span>
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

                                <form onSubmit={handleUpdatePointsConfig} className="f1-card hover-f1" style={{ gridColumn: 'span 2' }}>
                                    <h2 className="text-f1 mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        LEAGUE SETTINGS
                                        <button type="submit" disabled={submitting} className="btn-primary" style={{ fontSize: '0.7rem', height: 'auto', padding: '0.5rem 1rem' }}>
                                            {submitting ? 'SAVING...' : 'SAVE CONFIG'}
                                        </button>
                                    </h2>
                                    <div className="grid grid-2 gap-4 mb-6 pr-4">
                                        <div className="input-group">
                                            <label>TOTAL RACES IN LEAGUE</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={pointsConfig.totalRaces || 0}
                                                onChange={e => setPointsConfig({ ...pointsConfig, totalRaces: parseInt(e.target.value) || 0 })}
                                                style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', width: '100%' }}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>DROP WORST RESULTS (MAX 25%)</label>
                                            <input
                                                type="number"
                                                title={`Max Allowed: ${Math.floor((pointsConfig.totalRaces || 0) * 0.25)}`}
                                                max={Math.floor((pointsConfig.totalRaces || 0) * 0.25)}
                                                min="0"
                                                value={pointsConfig.dropResultsCount || 0}
                                                onChange={e => {
                                                    let v = parseInt(e.target.value) || 0;
                                                    const max = Math.floor((pointsConfig.totalRaces || 0) * 0.25);
                                                    if (v > max) v = max;
                                                    setPointsConfig({ ...pointsConfig, dropResultsCount: v });
                                                }}
                                                style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', width: '100%' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group mb-8">
                                        <label>TRACK POOL (Select tracks for this league)</label>
                                        <div style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                            <div className="grid grid-3 gap-2">
                                                {F1_TRACKS_2025.map(track => {
                                                    const isSelected = pointsConfig.trackPool?.includes(track);
                                                    return (
                                                        <label key={track} className="flex items-center gap-2" style={{ fontSize: '0.8rem', cursor: 'pointer', color: isSelected ? 'white' : 'var(--silver)' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    const current = pointsConfig.trackPool || [];
                                                                    const trackPool = e.target.checked ? [...current, track] : current.filter(t => t !== track);
                                                                    setPointsConfig({ ...pointsConfig, trackPool });
                                                                }}
                                                            />
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--silver)', marginTop: '0.5rem', textAlign: 'right' }}>
                                            {pointsConfig.trackPool?.length || 0} / {pointsConfig.totalRaces || 0} Tracks Selected
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-lg border border-white/5 mb-8">
                                        <h3 style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--f1-red)', letterSpacing: '1px' }}>LEAGUE SETTINGS</h3>
                                        <label className="checkbox-container flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={pointsConfig.teamCompetition}
                                                onChange={e => setPointsConfig({ ...pointsConfig, teamCompetition: e.target.checked })}
                                            />
                                            <span className="checkmark"></span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>
                                                ENABLE TEAM COMPETITION
                                            </span>
                                        </label>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>
                                            If enabled, you can create custom teams and assign drivers to them. Results will contribute to a Team Standings leaderboard.
                                        </p>
                                    </div>

                                    <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '2rem 0' }} />

                                    <h2 className="text-f1 mb-4">RACE PLANNER</h2>
                                    <p className="mb-4" style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>Schedule upcoming races for your league.</p>
                                    <form onSubmit={handleScheduleRace} className="flex flex-col gap-4 mb-8">
                                        <div className="grid grid-3 gap-4 items-end">
                                            <div className="input-group">
                                                <label>SELECT TRACK</label>
                                                <select
                                                    value={scheduleTrack}
                                                    onChange={e => {
                                                        setScheduleTrack(e.target.value);
                                                        if (e.target.value !== 'RANDOM') setIsRandomTrack(false);
                                                    }}
                                                    disabled={isRandomTrack}
                                                    style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', opacity: isRandomTrack ? 0.5 : 1 }}
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
                                        </div>

                                        <div className="flex flex-wrap gap-6 items-center p-4 bg-white/5 rounded-lg border border-white/5">
                                            <label className="checkbox-container flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isRandomTrack}
                                                    onChange={e => setIsRandomTrack(e.target.checked)}
                                                />
                                                <span className="checkmark"></span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isRandomTrack ? 'var(--f1-red)' : 'white' }}>
                                                    🎲 RANDOM TRACK FROM POOL
                                                </span>
                                            </label>

                                            {isRandomTrack && (
                                                <div className="flex items-center gap-3 animate-fade-in">
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--silver)' }}>REVEAL TRACK</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="168"
                                                            value={revealHours}
                                                            onChange={e => setRevealHours(parseInt(e.target.value) || 0)}
                                                            style={{ width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', textAlign: 'center', fontWeight: 'bold' }}
                                                        />
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Hours before race</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </form>

                                    <div className="grid grid-2 gap-8">
                                        <div>
                                            <h3 className="text-f1 mb-4" style={{ fontSize: '0.9rem', color: 'var(--f1-red)' }}>UPCOMING RACES</h3>
                                            <div className="flex flex-col gap-2">
                                                {upcomingRaces.map(r => (
                                                    <div key={r.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                                                        <div>
                                                            <div className="text-f1" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {r.track}
                                                                {r.is_random && (
                                                                    <span title={`Random Choice (Reveals ${r.reveal_hours_before}h before)`} style={{ fontSize: '0.7rem', cursor: 'help' }}>🎲</span>
                                                                )}
                                                            </div>
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
                                </form>
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
                                    <div key={d.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/5 rounded border border-white/5 gap-4">
                                        <div className="w-full md:w-auto">
                                            <div className="text-f1" style={{ fontSize: '1rem' }}>{d.name}</div>
                                            <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>{d.team || 'Independent'}</span>
                                                    <span className="hidden md:inline" style={{ fontSize: '0.75rem', color: 'var(--f1-red)' }}>|</span>
                                                </div>
                                                <div className="flex items-center gap-2 w-full mt-2 md:mt-0">
                                                    <input
                                                        type="text"
                                                        value={d.game_name || ''}
                                                        onChange={(e) => setDrivers(prev => prev.map(drv => drv.id === d.id ? { ...drv, game_name: e.target.value } : drv))}
                                                        placeholder="In-Game Name..."
                                                        className="flex-grow md:flex-grow-0"
                                                        style={{ minWidth: '150px', fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', outline: 'none' }}
                                                        title="Used for automatic telemetry mapping"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateGameName(d.id, d.game_name || '')}
                                                        className="btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '0.65rem', minHeight: 'unset', whiteSpace: 'nowrap' }}
                                                    >
                                                        SAVE
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 w-full md:w-auto">
                                                <span style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>Color:</span>
                                                <input
                                                    type="color"
                                                    value={d.color || '#ffffff'}
                                                    onChange={(e) => setDrivers(prev => prev.map(drv => drv.id === d.id ? { ...drv, color: e.target.value } : drv))}
                                                    style={{
                                                        padding: '2px',
                                                        background: 'var(--f1-carbon-dark)',
                                                        border: '1px solid var(--glass-border)',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        width: '32px',
                                                        height: '32px'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleUpdateColor(d.id, d.color || '#ffffff')}
                                                    className="btn-secondary"
                                                    style={{ padding: '6px 12px', fontSize: '0.65rem', minHeight: 'unset', whiteSpace: 'nowrap' }}
                                                >
                                                    SAVE COLOR
                                                </button>
                                            </div>
                                            {pointsConfig.teamCompetition && (
                                                <div className="flex items-center gap-2 mt-2 w-full md:w-auto">
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>Team:</span>
                                                    <select
                                                        value={d.team_id || 'NONE'}
                                                        onChange={(e) => handleAssignTeam(d.id, e.target.value)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            border: '1px solid var(--glass-border)',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            outline: 'none',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        <option value="NONE">No Team</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>{team.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDriver(d.id)}
                                            className="btn-danger-text w-full md:w-auto text-left"
                                            style={{ padding: '0.5rem 0', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            REMOVE DRIVER
                                        </button>
                                    </div>
                                ))}
                                {drivers.length === 0 && <p className="text-center py-4" style={{ color: 'var(--silver)' }}>No drivers registered yet.</p>}
                            </div>
                        </div>

                        <div className="flex flex-col gap-8">
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
                                    <div className="input-group">
                                        <label>IN-GAME NAME (TELEMETRY)</label>
                                        <input value={newDriverGameName} onChange={e => setNewDriverGameName(e.target.value)} placeholder="Steam/Xbox/PSN Name" />
                                    </div>
                                    <div className="input-group">
                                        <label>DRIVER COLOR</label>
                                        <input
                                            type="color"
                                            value={newDriverColor}
                                            onChange={e => setNewDriverColor(e.target.value)}
                                            style={{
                                                padding: '2px',
                                                cursor: 'pointer',
                                                width: '40px',
                                                height: '40px',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '4px',
                                                background: 'var(--f1-carbon-dark)'
                                            }}
                                        />
                                    </div>
                                    <button onClick={handleAddDriver} disabled={submitting || !newDriverName} className="btn-primary mt-2">
                                        {submitting ? 'ADDING...' : 'ADD TO LEAGUE'}
                                    </button>
                                </div>
                            </div>

                            {pointsConfig.teamCompetition && (
                                <div className="f1-card animate-fade-in">
                                    <h2 className="text-f1 mb-4">TEAMS</h2>
                                    <div className="flex flex-col gap-3 mb-6">
                                        {teams.map(team => (
                                            <div key={team.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: team.color, border: '1px solid rgba(255,255,255,0.2)' }}></div>
                                                    <span className="text-f1" style={{ fontSize: '0.9rem' }}>{team.name}</span>
                                                </div>
                                                <button onClick={() => handleDeleteTeam(team.id)} className="btn-danger-text">DELETE</button>
                                            </div>
                                        ))}
                                        {teams.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>No teams created yet.</p>}
                                    </div>
                                    <form onSubmit={handleAddTeam} className="flex flex-col gap-3">
                                        <div className="input-group">
                                            <label>NEW TEAM NAME</label>
                                            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Scuderia Ferrari" />
                                        </div>
                                        <div className="input-group">
                                            <label>TEAM COLOR</label>
                                            <input
                                                type="color"
                                                value={newTeamColor}
                                                onChange={e => setNewTeamColor(e.target.value)}
                                                style={{
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    width: '40px',
                                                    height: '40px',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '4px',
                                                    background: 'var(--f1-carbon-dark)'
                                                }}
                                            />
                                        </div>
                                        <button type="submit" disabled={submitting || !newTeamName} className="btn-primary mt-2">
                                            {submitting ? 'ADDING...' : 'ADD TEAM'}
                                        </button>
                                    </form>
                                </div>
                            )}
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

                        <h3 className="text-f1 mb-4" style={{ fontSize: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>QUALIFYING POINTS</h3>
                        <div className="grid grid-4 gap-x-8 gap-y-4 mb-8">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div key={i + 1} className="flex items-center gap-3">
                                    <span style={{ width: '30px', fontWeight: '900', color: 'var(--silver)', opacity: 0.5 }}>{i + 1}.</span>
                                    <input
                                        type="number"
                                        value={pointsConfig.qualiPoints ? (pointsConfig.qualiPoints[i + 1] || 0) : 0}
                                        onChange={e => {
                                            const newPoints = { ...(pointsConfig.qualiPoints || {}), [i + 1]: parseInt(e.target.value) || 0 };
                                            setPointsConfig({ ...pointsConfig, qualiPoints: newPoints });
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button onClick={handleUpdatePointsConfig} disabled={submitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            {submitting ? 'SAVING CONFIG...' : 'SAVE POINTS SETTINGS'}
                        </button>
                    </div>
                )}

                {/* TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                    <div className="flex flex-col gap-6 animate-fade-in">
                        {managingSession ? (
                            <div className="flex flex-col gap-6">
                                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                    <div>
                                        <h2 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', letterSpacing: '-2px' }}>MANAGE SESSION</h2>
                                        <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>Aufgezeichnet: {new Date(managingSession.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                if (confirm('Session-Zuordnung zurücksetzen? Die Teilnehmer-Zuordnungen bleiben erhalten, du kehrst nur zur Sesssion-Übersicht zurück.')) {
                                                    setManagingSession(null);
                                                }
                                            }}
                                            className="btn-secondary"
                                            style={{ background: 'rgba(255,24,1,0.1)', borderColor: 'rgba(255,24,1,0.3)', color: 'var(--f1-red)', fontSize: '0.7rem' }}
                                        >
                                            ↩ RESET / ZURÜCK
                                        </button>
                                        <button onClick={() => setManagingSession(null)} className="btn-secondary">ZURÜCK ZU SESSIONS</button>
                                    </div>
                                </header>

                                <div className="f1-card mb-6">
                                    <h3 className="text-f1 mb-4" style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>MAP PARTICIPANTS</h3>
                                    <p className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--silver)' }}>Assign returning drivers to their in-game names. Mappings are saved to their profile automatically.</p>

                                    <div className="flex flex-col gap-3">
                                        {sessionParticipants.map((p, idx) => (
                                            <div key={p.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/5 rounded border border-white/5 gap-4">
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--f1-red)', width: '30px' }}>{idx + 1}</span>
                                                    <div>
                                                        <div className="text-f1" style={{ fontSize: '1rem' }}>{p.game_name} {p.is_human && <span style={{ fontSize: '0.6rem', color: 'var(--silver)', marginLeft: '4px' }}>(HUMAN)</span>}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>Fastest Lap: {p.fastest_lap_ms ? `${(p.fastest_lap_ms / 1000).toFixed(3)}s` : 'N/A'} - Top Speed: {p.top_speed ? `${p.top_speed.toFixed(1)} km/h` : 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-auto mt-2 md:mt-0">
                                                    <select
                                                        value={p.driver_id || ''}
                                                        onChange={(e) => handleAssignTelemetryPlayer(p.game_name, e.target.value)}
                                                        disabled={submitting}
                                                        style={{
                                                            padding: '0.8rem',
                                                            background: p.driver_id ? 'rgba(0, 255, 0, 0.1)' : 'var(--f1-carbon-dark)',
                                                            border: `1px solid ${p.driver_id ? 'rgba(0, 255, 0, 0.3)' : 'var(--f1-red)'}`,
                                                            borderRadius: '6px',
                                                            color: 'white',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            minWidth: '220px'
                                                        }}
                                                    >
                                                        <option value="" disabled>--- SELECT LEAGUE DRIVER ---</option>
                                                        {drivers.map(d => (
                                                            <option key={d.id} value={d.id}>{d.name} {d.game_name ? `(${d.game_name})` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                        {sessionParticipants.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>No participants found in this session.</p>}
                                    </div>
                                </div>

                                <div className="f1-card" style={{ border: '1px solid var(--f1-red)' }}>
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div style={{ flex: 1 }}>
                                            <h3 className="text-f1" style={{ fontSize: '1.2rem', color: 'var(--f1-red)' }}>PROMOTE TO CHAMPIONSHIP RACE</h3>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--silver)', marginTop: '0.5rem' }}>
                                                Strecke auswählen und Session als offizielles Rennergebnis speichern. Punkte werden automatisch berechnet.
                                                <strong style={{ color: '#ffc107' }}> Nicht zugeordnete Fahrer erhalten automatisch DNF und 0 Punkte.</strong>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <select
                                                value={sessionPromoteTrack}
                                                onChange={e => setSessionPromoteTrack(e.target.value)}
                                                style={{ padding: '0.8rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', minWidth: '150px' }}
                                            >
                                                {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <button
                                                onClick={handlePromoteTelemetry}
                                                disabled={submitting}
                                                className="btn-primary"
                                                style={{ whiteSpace: 'nowrap' }}
                                            >
                                                {submitting ? 'PROMOTING...' : 'PROMOTE NOW'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="f1-card">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-f1">RECORDED TELEMETRY SESSIONS</h2>
                                    <button onClick={() => refreshTelemetry(leagueId || '', adminPass)} className="btn-secondary" style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}>REFRESH</button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {telemetrySessions.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-4 bg-white/5 rounded border border-white/5 hover-f1 transition-all">
                                            <div>
                                                <div className="text-f1" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {s.session_type}
                                                    {s.is_active && <span className="status-badge badge-red animate-pulse">LIVE</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--silver)', marginTop: '4px' }}>
                                                    Track: <strong style={{ color: 'white' }}>{getTrackNameById(s.track_id)}</strong> | 
                                                    Date: {new Date(s.created_at).toLocaleString()} | Participants: <strong style={{ color: 'white' }}>{s.participants_count}</strong> | Status: {s.race_id ? <span style={{ color: 'var(--f1-red)' }}>Promoted</span> : <span style={{ color: 'yellow' }}>Unassigned</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleManageTelemetry(s.id)} className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.75rem' }}>MANAGE</button>
                                                <button onClick={() => handleDeleteTelemetry(s.id)} className="btn-danger-text" style={{ padding: '0 0.5rem' }}>DELETE</button>
                                            </div>
                                        </div>
                                    ))}
                                    {telemetrySessions.length === 0 && (
                                        <div className="text-center py-8">
                                            <p style={{ color: 'var(--silver)', marginBottom: '1rem' }}>No telemetry sessions recorded yet.</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--silver)', opacity: 0.7 }}>Run your local F1 Router App to begin transmitting telemetry data to your league dashboard.</p>
                                        </div>
                                    )}
                                </div>

                                {discoverableSessions.length > 0 && (
                                    <div className="mt-12 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl">🔍</div>
                                            <div>
                                                <h2 className="text-f1 text-yellow-500" style={{ fontSize: '1.2rem' }}>DISCOVERABLE SESSIONS (UNASSIGNED)</h2>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>Telemetry recorded with unknown or incorrect league data. You can "Adopt" these into your league.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {discoverableSessions.map(s => (
                                                <div key={s.id} className="flex justify-between items-center p-4 bg-black/40 rounded border border-white/5 hover:border-yellow-500/30 transition-all">
                                                    <div>
                                                        <div className="text-f1" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {s.session_type}
                                                            <span className="status-badge" style={{ background: 'rgba(255,193,7,0.1)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.3)' }}>ORPHANED</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--silver)', marginTop: '4px' }}>
                                                            Original Name: <strong style={{ color: '#ffc107' }}>{s.original_league_name}</strong> | 
                                                            Track: <strong style={{ color: 'white' }}>{getTrackNameById(s.track_id)}</strong> | 
                                                            Humans: <strong style={{ color: 'white' }}>{s.human_count}</strong> | 
                                                            {new Date(s.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleClaimSession(s.id)} 
                                                        disabled={submitting}
                                                        className="btn-primary" 
                                                        style={{ background: '#ffc107', color: 'black', padding: '0.5rem 1.5rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                                                    >
                                                        {submitting ? 'ADOPTING...' : 'ADOPT SESSION'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
