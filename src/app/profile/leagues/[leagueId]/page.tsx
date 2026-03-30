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

export default function AdminHub({ params }: { params: { leagueId: string } }) {
    // Auth State
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [authType, setAuthType] = useState<'league' | null>(null);
    const [leagueName, setLeagueName] = useState('');
    const adminPass = "session";
    const leagueId = params.leagueId;

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
        
    }, []);

    useEffect(() => {
        async function init() {
            setIsLoggedIn(true);
            const pRes = await getPointsConfig(leagueId);
            if (pRes.success && pRes.config) setPointsConfig(pRes.config);
            const teamsRes = await getAllTeams(leagueId);
            if (teamsRes.success) setTeams(teamsRes.teams || []);
            refreshRaces(leagueId);
            refreshTelemetry(leagueId, "session");
            const driversRes = await getAdminLeagueDrivers(leagueId, "session");
            if (driversRes.success) setDrivers(driversRes.drivers || []);
            const dashRes = await getDashboardData(leagueId);
            if(dashRes.success && dashRes.league) setLeagueName(dashRes.league.name);
        }
        if (leagueId) init();
    }, [leagueId]);
    const checkSession_unused = async () => {
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
                        // removed setAdminPass // keep pass for actions
                        // setLeagueId
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
            // removed setLeagueId
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
        // removed setAdminPass
        // removed setLeagueId
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
            <div className="flex items-center justify-center min-h-screen relative overflow-hidden" 
                 style={{ background: 'var(--f1-carbon-dark)' }}>
                {/* Background effects */}
                <div className="absolute inset-0 opacity-20" 
                     style={{ 
                        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--f1-red) 0%, transparent 70%)',
                        filter: 'blur(100px)' 
                     }}></div>
                
                <div className="relative z-10 glass-panel animate-scale-in" 
                     style={{ maxWidth: '480px', width: '90%', padding: '3.5rem 2.5rem', border: '1px solid var(--glass-border)' }}>
                    
                    <div className="text-center mb-large">
                        <div className="inline-block mb-small">
                            <span className="text-f1-bold" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', letterSpacing: '4px' }}>ACCESS RESTRICTED</span>
                        </div>
                        <h1 className="h1 text-gradient mb-xsmall" style={{ fontSize: '3rem', lineHeight: 1 }}>ADMIN HUB</h1>
                        <p className="stat-label">AUTHENTICATION REQUIRED FOR LEAGUE CONTROL</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-medium">
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>SELECT LEAGUE</label>
                            <select
                                value={leagueName}
                                onChange={e => setLeagueName(e.target.value)}
                                required
                                className="glass-panel"
                                style={{
                                    padding: '1rem',
                                    width: '100%',
                                    background: 'var(--glass-surface)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px',
                                    outline: 'none',
                                    appearance: 'none', // Custom arrow if needed
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled>CHOOSE SESSION...</option>
                                {leaguesList.map(l => (
                                    <option key={l.id} value={l.name} style={{ color: 'black' }}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>SECURITY CLEARANCE</label>
                            <input
                                type="password"
                                value={adminPass}
                                onChange={() => {}}
                                placeholder="••••••••"
                                required
                                className="glass-panel"
                                style={{
                                    padding: '1rem',
                                    background: 'var(--glass-surface)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary w-full mt-small"
                            style={{ padding: '1.25rem', fontSize: '0.9rem', justifyContent: 'center' }}
                            disabled={loading}
                        >
                            {loading ? 'SYNCHRONIZING...' : 'ESTABLISH CONNECTION'}
                        </button>
                    </form>

                    <div className="text-center mt-large pt-medium" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <Link href="/" className="stat-label hover-f1" style={{ textDecoration: 'none', transition: 'all 0.3s' }}>
                            &larr; ABORT AND RETURN TO DASHBOARD
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in relative pb-large">
            {/* ── HEADER ── */}
            <div className="glass-panel" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, marginBottom: '2rem' }}>
                <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
                    <div className="flex justify-between items-start md:items-end flex-wrap gap-large">
                        <div>
                            <div className="flex items-center gap-small mb-small">
                                <span className="text-f1-bold badge-silver" style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '2px', color: 'var(--f1-red)' }}>
                                    SYSTEM OVERRIDE
                                </span>
                                <span className="stat-label">// {leagueName.toUpperCase()} CONTROL PANEL</span>
                            </div>
                            <h1 className="h1 text-gradient" style={{ fontSize: '4rem', marginBottom: 0 }}>
                                ADMIN HUB
                            </h1>
                        </div>
                        
                        <div className="flex items-center gap-medium">
                            <nav className="flex gap-xsmall glass-panel p-1">
                                {[
                                    { id: 'races', label: 'RACE PLANNER' },
                                    { id: 'drivers', label: 'DRIVERS & TEAMS' },
                                    { id: 'points', label: 'LEAGUE SPECS' },
                                    { id: 'telemetry', label: 'TELEMETRY' }
                                ].map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id as any); setManagingSession(null); }}
                                        className={`btn btn-xs ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                            
                            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                                TERMINATE SESSION
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container animate-fade-in">
                {/* RACE ENTRY TAB */}
                {activeTab === 'races' && (
                    <div className="flex flex-col gap-large">
                        {editingRaceId ? (
                            <div className="flex flex-col gap-large animate-scale-in">
                                <div className="glass-panel" style={{ padding: '2rem' }}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-medium">
                                        <div>
                                            <h2 className="h2 text-gradient mb-xsmall">EDIT RACE DATA</h2>
                                            <p className="stat-label">OVERRIDE STANDINGS AND BONUSES FOR THIS EVENT</p>
                                        </div>
                                        <div className="flex flex-col gap-xsmall" style={{ minWidth: '280px' }}>
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--f1-red)', letterSpacing: '1px' }}>RACE LOCATION</label>
                                            <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'var(--glass-surface)', color: 'var(--text-secondary)', fontWeight: 800, fontSize: '0.9rem' }}>
                                                {editingRaceTrack.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-xsmall">
                                    {editResults.sort((a, b) => a.position - b.position).map((res) => (
                                        <div key={res.driver_id} 
                                             className="glass-panel flex flex-col md:flex-row justify-between items-center gap-medium" 
                                             style={{ padding: '0.75rem 1.5rem', background: 'var(--f1-carbon-dark)', borderLeft: '4px solid var(--f1-red)' }}>
                                            
                                            <div style={{ minWidth: '200px' }}>
                                                <span className="text-f1-bold" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{res.driver_name.toUpperCase()}</span>
                                            </div>

                                            <div className="flex flex-wrap gap-large items-center justify-end flex-grow">
                                                <div className="flex items-center gap-small">
                                                    <span className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>P</span>
                                                    <input
                                                        type="number"
                                                        min="1" max="25"
                                                        value={res.position}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'position', parseInt(e.target.value))}
                                                        className="glass-panel text-center"
                                                        style={{ width: '50px', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, borderRadius: '2px' }}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-small">
                                                    <span className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>QP</span>
                                                    <input
                                                        type="number"
                                                        min="0" max="25"
                                                        value={res.quali_position || 0}
                                                        onChange={e => handleUpdateEditResult(res.driver_id, 'quali_position', parseInt(e.target.value))}
                                                        className="glass-panel text-center"
                                                        style={{ width: '50px', padding: '0.4rem', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, borderRadius: '2px' }}
                                                    />
                                                </div>

                                                {/* Checklist-style status bits */}
                                                <div className="flex gap-medium">
                                                    {[
                                                        { key: 'fastest_lap', label: 'FL', color: 'var(--f1-red)' },
                                                        { key: 'clean_driver', label: 'CD', color: '#00ffaa' },
                                                        { key: 'is_dnf', label: 'DNF', color: '#ffaa00' }
                                                    ].map(bit => (
                                                        <label key={bit.key} className="flex items-center gap-xsmall cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={!!res[bit.key as keyof typeof res]}
                                                                onChange={e => handleUpdateEditResult(res.driver_id, bit.key, e.target.checked)}
                                                            />
                                                            <div className={`w-8 h-8 flex items-center justify-center text-f1-bold border transition-all ${res[bit.key as keyof typeof res] ? 'bg-white text-black' : 'border-white/10 text-white/20 group-hover:border-white/40'}`}
                                                                 style={{ fontSize: '0.6rem', borderRadius: '1px' }}>
                                                                {bit.label}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>

                                                <div className="flex flex-col items-end" style={{ minWidth: '80px' }}>
                                                    <span className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--f1-red)' }}>
                                                        {formatPoints(calculatePoints({ position: res.position, qualiPosition: res.quali_position || 0, fastestLap: res.fastest_lap, cleanDriver: res.clean_driver, isDnf: res.is_dnf }, pointsConfig))}
                                                    </span>
                                                    <span className="text-f1-bold" style={{ fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>POINTS</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-medium">
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={submitting}
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                    >
                                        {submitting ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                                    </button>
                                    <button
                                        onClick={() => setEditingRaceId(null)}
                                        className="btn btn-secondary"
                                        style={{ minWidth: '150px' }}
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-2 gap-large animate-fade-in">
                                {/* Manual Entry Quick Card */}
                                <div className="glass-panel hover-f1 flex flex-col justify-between" style={{ padding: '2rem' }}>
                                    <div>
                                        <div className="flex items-center gap-small mb-small">
                                            <div className="w-2 h-8 bg-f1-red"></div>
                                            <h2 className="h2 text-gradient">LEGACY ENTRY</h2>
                                        </div>
                                        <p className="stat-label mb-medium">QUICKLY ENTER RESULTS BY HAND FOR MAXIMUM CONTROL OVER STANDINGS.</p>
                                    </div>
                                    <Link href="/admin/results" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                                        LAUNCH MANUAL INPUT
                                    </Link>
                                </div>

                                {/* League Settings Card */}
                                <div className="glass-panel" style={{ padding: '2rem', gridColumn: 'span 2' }}>
                                    <form onSubmit={handleUpdatePointsConfig}>
                                        <div className="flex justify-between items-center mb-large">
                                            <div className="flex items-center gap-small">
                                                <div className="w-2 h-8 bg-f1-red"></div>
                                                <h2 className="h2 text-gradient">LEAGUE CONFIGURATION</h2>
                                            </div>
                                            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.7rem' }}>
                                                {submitting ? 'SYNCING...' : 'SAVE SETTINGS'}
                                            </button>
                                        </div>

                                        <div className="grid grid-2 gap-medium mb-large">
                                            <div className="flex flex-col gap-xsmall">
                                                <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SEASON LENGTH (RACES)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={pointsConfig.totalRaces || 0}
                                                    onChange={e => setPointsConfig({ ...pointsConfig, totalRaces: parseInt(e.target.value) || 0 })}
                                                    className="glass-panel"
                                                    style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-xsmall">
                                                <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>DROP RESULTS (STREICHRESULTATE)</label>
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
                                                    className="glass-panel"
                                                    style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-xsmall mb-large">
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>ACTIVE TRACK POOL</label>
                                            <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', maxHeight: '200px', overflowY: 'auto' }}>
                                                <div className="grid grid-4 gap-small">
                                                    {F1_TRACKS_2025.map(track => {
                                                        const isSelected = pointsConfig.trackPool?.includes(track);
                                                        return (
                                                            <label key={track} className="flex items-center gap-small cursor-pointer group">
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        const current = pointsConfig.trackPool || [];
                                                                        const trackPool = e.target.checked ? [...current, track] : current.filter(t => t !== track);
                                                                        setPointsConfig({ ...pointsConfig, trackPool });
                                                                    }}
                                                                />
                                                                <div className={`w-4 h-4 border transition-all ${isSelected ? 'bg-f1-red border-f1-red' : 'border-white/20 group-hover:border-white/40'}`}></div>
                                                                <span className="text-f1-bold" style={{ fontSize: '0.65rem', color: isSelected ? 'white' : 'var(--text-muted)' }}>
                                                                    {track.toUpperCase()}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="text-right mt-xsmall">
                                                <span className="stat-label" style={{ color: 'var(--f1-red)' }}>{pointsConfig.trackPool?.length || 0} / {pointsConfig.totalRaces || 0} TRACKS CONFIGURED</span>
                                            </div>
                                        </div>

                                        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,25,25,0.05)', border: '1px solid rgba(255,25,25,0.1)' }}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-f1-bold" style={{ fontSize: '0.9rem', color: 'var(--f1-red)' }}>TEAM COMPETITION</h3>
                                                    <p className="stat-label">ENABLE CONSTRUCTOR STANDINGS AND CUSTOM TEAMS.</p>
                                                </div>
                                                <label className="flex items-center gap-medium cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={pointsConfig.teamCompetition}
                                                        onChange={e => setPointsConfig({ ...pointsConfig, teamCompetition: e.target.checked })}
                                                    />
                                                    <div className={`w-12 h-6 rounded-full relative transition-all ${pointsConfig.teamCompetition ? 'bg-f1-red' : 'bg-white/10'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pointsConfig.teamCompetition ? 'left-7' : 'left-1'}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                    <div className="flex flex-col gap-large" style={{ gridColumn: 'span 2' }}>
                                        <div className="glass-panel" style={{ padding: '2rem' }}>
                                            <div className="flex items-center gap-small mb-medium">
                                                <div className="w-2 h-8 bg-f1-red"></div>
                                                <h2 className="h2 text-gradient">RACE PLANNER</h2>
                                            </div>
                                            <p className="stat-label mb-large">SCHEDULE UPCOMING EVENTS FOR YOUR LEAGUE SEASON.</p>

                                            <form onSubmit={handleScheduleRace} className="flex flex-col gap-medium">
                                                <div className="grid grid-3 gap-medium items-end">
                                                    <div className="flex flex-col gap-xsmall">
                                                        <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SELECT TRACK</label>
                                                        <select
                                                            value={scheduleTrack}
                                                            onChange={e => {
                                                                setScheduleTrack(e.target.value);
                                                                if (e.target.value !== 'RANDOM') setIsRandomTrack(false);
                                                            }}
                                                            disabled={isRandomTrack}
                                                            className="glass-panel"
                                                            style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white', opacity: isRandomTrack ? 0.5 : 1 }}
                                                        >
                                                            {F1_TRACKS_2025.map(t => <option key={t} value={t} style={{ color: 'black' }}>{t.toUpperCase()}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-xsmall">
                                                        <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>DATE & TIME</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={scheduleDate}
                                                            onChange={e => setScheduleDate(e.target.value)}
                                                            required
                                                            className="glass-panel"
                                                            style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                                        />
                                                    </div>
                                                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '46px', justifyContent: 'center' }}>
                                                        {submitting ? 'SYNCHRONIZING...' : 'SCHEDULE EVENT'}
                                                    </button>
                                                </div>

                                                <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                                    <div className="flex flex-wrap gap-large items-center">
                                                        <label className="flex items-center gap-small cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isRandomTrack}
                                                                onChange={e => setIsRandomTrack(e.target.checked)}
                                                            />
                                                            <div className={`w-4 h-4 border transition-all ${isRandomTrack ? 'bg-f1-red border-f1-red' : 'border-white/20 group-hover:border-white/40'}`}></div>
                                                            <span className="text-f1-bold" style={{ fontSize: '0.7rem', color: isRandomTrack ? 'var(--f1-red)' : 'var(--text-muted)' }}>
                                                                RANDOM TRACK FROM POOL
                                                            </span>
                                                        </label>

                                                        {isRandomTrack && (
                                                            <div className="flex items-center gap-medium animate-fade-in pl-medium" style={{ borderLeft: '1px solid var(--glass-border)' }}>
                                                                <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>REVEAL WINDOW</label>
                                                                <div className="flex items-center gap-small">
                                                                    <input
                                                                        type="number"
                                                                        min="0" max="168"
                                                                        value={revealHours}
                                                                        onChange={e => setRevealHours(parseInt(e.target.value) || 0)}
                                                                        className="glass-panel text-center"
                                                                        style={{ width: '60px', padding: '0.4rem', background: 'var(--glass-surface)', color: 'white', fontWeight: 800 }}
                                                                    />
                                                                    <span className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>HOURS BEFORE RACE</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </form>
                                        </div>

                                        <div className="grid grid-2 gap-large">
                                            {/* UPCOMING RACES LIST */}
                                            <div className="glass-panel" style={{ padding: '2rem' }}>
                                                <h3 className="text-f1-bold mb-medium" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>UPCOMING SESSIONS</h3>
                                                <div className="flex flex-col gap-xsmall">
                                                    {upcomingRaces.map(r => (
                                                        <div key={r.id} className="flex justify-between items-center p-medium glass-panel" style={{ background: 'var(--f1-carbon-dark)', padding: '0.75rem 1rem' }}>
                                                            <div>
                                                                <div className="text-f1-bold" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {r.track.toUpperCase()}
                                                                    {r.is_random && (
                                                                        <span title={`Random Choice (Reveals ${r.reveal_hours_before}h before)`} style={{ fontSize: '0.8rem', cursor: 'help' }}>🎲</span>
                                                                    )}
                                                                </div>
                                                                <div className="stat-label" style={{ fontSize: '0.6rem' }}>{new Date(r.scheduled_date || '').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }).toUpperCase()}</div>
                                                            </div>
                                                            <button onClick={() => handleDeleteScheduledRace(r.id, r.track)} className="btn-danger-text">CANCEL</button>
                                                        </div>
                                                    ))}
                                                    {upcomingRaces.length === 0 && <p className="stat-label text-center py-medium">NO RACES SCHEDULED</p>}
                                                </div>
                                            </div>

                                            {/* FINISHED RACES LIST */}
                                            <div className="glass-panel" style={{ padding: '2rem' }}>
                                                <h3 className="text-f1-bold mb-medium" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>COMPLETED EVENTS</h3>
                                                <div className="flex flex-col gap-xsmall">
                                                    {finishedRaces.map(r => (
                                                        <div key={r.id} className="flex justify-between items-center p-medium glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem' }}>
                                                            <div>
                                                                <div className="text-f1-bold" style={{ fontSize: '0.9rem' }}>{r.track.toUpperCase()}</div>
                                                                <div className="stat-label" style={{ fontSize: '0.6rem' }}>{new Date(r.race_date || r.created_at || '').toLocaleDateString([], { dateStyle: 'medium' }).toUpperCase()}</div>
                                                            </div>
                                                            <div className="flex gap-small">
                                                                <button onClick={() => handleStartEdit(r.id, r.track)} className="btn btn-secondary btn-xs">MODIFY</button>
                                                                <button onClick={() => handleDeleteRace(r.id, r.track)} className="btn btn-danger btn-xs">WIPE</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {finishedRaces.length === 0 && <p className="stat-label text-center py-medium">NO DATA RECORDED</p>}
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
                    <div className="flex flex-col gap-large animate-fade-in">
                        <div className="grid grid-2 gap-large">
                            {/* DRIVERS LIST */}
                            <div className="glass-panel" style={{ padding: '2rem' }}>
                                <div className="flex items-center gap-small mb-medium">
                                    <div className="w-2 h-8 bg-f1-red"></div>
                                    <h2 className="h2 text-gradient">DRIVERS REGISTRY</h2>
                                </div>
                                <p className="stat-label mb-large">MANAGE ALL REGISTERED ATHLETES AND THEIR TELEMETRY MAPPINGS.</p>

                                <div className="flex flex-col gap-xsmall">
                                    {drivers.map(d => (
                                        <div key={d.id} className="glass-panel" style={{ background: 'var(--f1-carbon-dark)', padding: '1.25rem' }}>
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-medium">
                                                <div className="flex items-center gap-medium">
                                                    <div className="w-8 h-8 rounded-sm" style={{ background: d.color || '#fff', border: '2px solid rgba(255,255,255,0.1)' }}></div>
                                                    <div>
                                                        <div className="text-f1-bold" style={{ fontSize: '1.1rem' }}>{d.name.toUpperCase()}</div>
                                                        <div className="stat-label" style={{ fontSize: '0.65rem', color: 'var(--f1-red)' }}>{d.team?.toUpperCase() || 'INDEPENDENT'}</div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-medium items-center justify-end flex-grow">
                                                    <div className="flex flex-col gap-xsmall">
                                                        <label className="text-f1-bold" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>IN-GAME NAME</label>
                                                        <div className="flex gap-xsmall">
                                                            <input
                                                                type="text"
                                                                value={d.game_name || ''}
                                                                onChange={(e) => setDrivers(prev => prev.map(drv => drv.id === d.id ? { ...drv, game_name: e.target.value } : drv))}
                                                                placeholder="IDENTIFIER..."
                                                                className="glass-panel"
                                                                style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.75rem', borderRadius: '2px', width: '150px' }}
                                                            />
                                                            <button
                                                                onClick={() => handleUpdateGameName(d.id, d.game_name || '')}
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.5rem', fontSize: '0.6rem' }}
                                                            >
                                                                SYNC
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-xsmall">
                                                        <label className="text-f1-bold" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>LIVERY</label>
                                                        <div className="flex gap-xsmall">
                                                           <input
                                                               type="color"
                                                               value={d.color || '#ffffff'}
                                                               onChange={(e) => setDrivers(prev => prev.map(drv => drv.id === d.id ? { ...drv, color: e.target.value } : drv))}
                                                               style={{ padding: '0', background: 'none', border: 'none', width: '32px', height: '32px', cursor: 'pointer' }}
                                                           />
                                                           <button
                                                               onClick={() => handleUpdateColor(d.id, d.color || '#ffffff')}
                                                               className="btn btn-secondary"
                                                               style={{ padding: '0.5rem', fontSize: '0.6rem' }}
                                                           >
                                                               SET
                                                           </button>
                                                        </div>
                                                    </div>
                                                    
                                                    {pointsConfig.teamCompetition && (
                                                       <div className="flex flex-col gap-xsmall">
                                                           <label className="text-f1-bold" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>TEAM ALLIANCE</label>
                                                           <select
                                                               value={d.team_id || 'NONE'}
                                                               onChange={(e) => handleAssignTeam(d.id, e.target.value)}
                                                               className="glass-panel"
                                                               style={{ padding: '0.52rem 0.75rem', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.75rem', borderRadius: '2px' }}
                                                           >
                                                               <option value="NONE" style={{ color: 'black' }}>NO ALLIANCE</option>
                                                               {teams.map(team => (
                                                                   <option key={team.id} value={team.id} style={{ color: 'black' }}>{team.name.toUpperCase()}</option>
                                                               ))}
                                                           </select>
                                                       </div>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteDriver(d.id)}
                                                        className="btn-danger-text"
                                                        style={{ marginLeft: '1rem' }}
                                                    >
                                                        WIPE
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {drivers.length === 0 && <p className="stat-label text-center py-large">NO DRIVERS REGISTERED</p>}
                                </div>
                            </div>

                            <div className="flex flex-col gap-large">
                                {/* ADD DRIVER FORM */}
                                <div className="glass-panel" style={{ padding: '2rem' }}>
                                    <div className="flex items-center gap-small mb-medium">
                                        <div className="w-2 h-8 bg-f1-red"></div>
                                        <h2 className="h2 text-gradient">RECRUIT DRIVER</h2>
                                    </div>
                                    <div className="flex flex-col gap-medium">
                                        <div className="flex flex-col gap-xsmall">
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>LEGAL NAME</label>
                                            <input 
                                               value={newDriverName} 
                                               onChange={e => setNewDriverName(e.target.value)} 
                                               placeholder="MAX MUSTERMANN"
                                               className="glass-panel"
                                               style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-xsmall">
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CONSTRUCTOR / TEAM</label>
                                            <input 
                                               value={newDriverTeam} 
                                               onChange={e => setNewDriverTeam(e.target.value)} 
                                               placeholder="MERCEDES-AMG / PRIVATEER"
                                               className="glass-panel"
                                               style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-xsmall">
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TELEMETRY IDENTIFIER</label>
                                            <input 
                                               value={newDriverGameName} 
                                               onChange={e => setNewDriverGameName(e.target.value)} 
                                               placeholder="STEAM / XBOX / PSN NAME"
                                               className="glass-panel"
                                               style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-xsmall">
                                            <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>LIVERY COLOR</label>
                                            <input
                                                type="color"
                                                value={newDriverColor}
                                                onChange={e => setNewDriverColor(e.target.value)}
                                                style={{ width: '100%', height: '40px', background: 'none', border: '1px solid var(--glass-border)', cursor: 'pointer', padding: '2px' }}
                                            />
                                        </div>
                                        <button 
                                           onClick={handleAddDriver} 
                                           disabled={submitting} 
                                           className="btn btn-primary w-full mt-medium"
                                        >
                                            {submitting ? 'RECRUITING...' : 'ENLIST DRIVER'}
                                        </button>
                                    </div>
                                </div>

                                {/* TEAM MANAGEMENT SECTION */}
                                {pointsConfig.teamCompetition && (
                                    <div className="glass-panel animate-scale-in" style={{ padding: '2rem' }}>
                                        <div className="flex items-center gap-small mb-medium">
                                            <div className="w-2 h-8 bg-black"></div>
                                            <h2 className="h2" style={{ color: 'white' }}>FACTORY TEAMS</h2>
                                        </div>
                                        
                                        <div className="flex flex-col gap-xsmall mb-large">
                                            {teams.map(team => (
                                                <div key={team.id} className="flex justify-between items-center p-medium glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem' }}>
                                                    <div className="flex items-center gap-medium">
                                                        <div className="w-4 h-4" style={{ background: team.color || '#fff' }}></div>
                                                        <span className="text-f1-bold" style={{ fontSize: '0.9rem' }}>{team.name.toUpperCase()}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTeam(team.id)} className="btn btn-danger btn-xs">DISSOLVE</button>
                                                </div>
                                            ))}
                                            {teams.length === 0 && <p className="stat-label text-center py-medium">NO TEAMS ESTABLISHED</p>}
                                        </div>

                                        <form onSubmit={handleAddTeam} className="flex flex-col gap-medium pt-medium" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                            <div className="flex flex-col gap-xsmall">
                                                <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CONSTRUCTOR NAME</label>
                                                <input 
                                                    value={newTeamName} 
                                                    onChange={e => setNewTeamName(e.target.value)} 
                                                    placeholder="TEAM NAME..." 
                                                    className="glass-panel"
                                                    style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white' }}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-xsmall">
                                                <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>OFFICIAL COLOR</label>
                                                <input 
                                                    type="color" 
                                                    value={newTeamColor} 
                                                    onChange={e => setNewTeamColor(e.target.value)}
                                                    style={{ width: '100%', height: '32px', background: 'none', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                                                />
                                            </div>
                                            <button type="submit" disabled={submitting || !newTeamName} className="btn btn-secondary w-full">
                                                {submitting ? 'COMMISSIONING...' : 'ESTABLISH FACTORY TEAM'}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* POINTS CONFIG TAB */}
                {activeTab === 'points' && (
                    <div className="flex flex-col gap-large animate-fade-in">
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <div className="flex items-center gap-small mb-medium">
                                <div className="w-2 h-8 bg-f1-red"></div>
                                <h2 className="h2 text-gradient">POINTS SYSTEM CONFIGURATION</h2>
                            </div>
                            <p className="stat-label mb-large">ADJUST THE CHAMPIONSHIP POINT DISTRIBUTION AND BONUSES.</p>

                            <div className="grid grid-3 gap-large mb-large">
                                <div className="flex flex-col gap-xsmall">
                                    <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FASTEST LAP BONUS</label>
                                    <input
                                        type="number"
                                        value={pointsConfig.fastestLapBonus}
                                        onChange={e => setPointsConfig({ ...pointsConfig, fastestLapBonus: parseInt(e.target.value) || 0 })}
                                        className="glass-panel"
                                        style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white', fontWeight: 800 }}
                                    />
                                </div>
                                <div className="flex flex-col gap-xsmall">
                                    <label className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CLEAN DRIVER BONUS</label>
                                    <input
                                        type="number"
                                        value={pointsConfig.cleanDriverBonus}
                                        onChange={e => setPointsConfig({ ...pointsConfig, cleanDriverBonus: parseInt(e.target.value) || 0 })}
                                        className="glass-panel"
                                        style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white', fontWeight: 800 }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-2 gap-xlarge">
                                <div>
                                    <h3 className="text-f1-bold mb-medium" style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--f1-red)' }}>RACE FINISH POINTS</h3>
                                    <div className="grid grid-2 gap-small">
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <div key={i + 1} className="flex items-center gap-small p-xsmall glass-panel" style={{ background: 'var(--f1-carbon-dark)' }}>
                                                <span style={{ width: '24px', fontWeight: '900', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{i + 1}.</span>
                                                <input
                                                    type="number"
                                                    value={pointsConfig.points[i + 1] || 0}
                                                    onChange={e => {
                                                        const newPoints = { ...pointsConfig.points, [i + 1]: parseInt(e.target.value) || 0 };
                                                        setPointsConfig({ ...pointsConfig, points: newPoints });
                                                    }}
                                                    className="bg-transparent border-none text-white w-full outline-none"
                                                    style={{ fontWeight: 800, fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-f1-bold mb-medium" style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>QUALIFYING POINTS</h3>
                                    <div className="grid grid-2 gap-small">
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <div key={i + 1} className="flex items-center gap-small p-xsmall glass-panel" style={{ background: 'var(--f1-carbon-dark)' }}>
                                                <span style={{ width: '24px', fontWeight: '900', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{i + 1}.</span>
                                                <input
                                                    type="number"
                                                    value={pointsConfig.qualiPoints ? (pointsConfig.qualiPoints[i + 1] || 0) : 0}
                                                    onChange={e => {
                                                        const newPoints = { ...(pointsConfig.qualiPoints || {}), [i + 1]: parseInt(e.target.value) || 0 };
                                                        setPointsConfig({ ...pointsConfig, qualiPoints: newPoints });
                                                    }}
                                                    className="bg-transparent border-none text-white w-full outline-none"
                                                    style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.7 }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleUpdatePointsConfig} disabled={submitting} className="btn btn-primary w-full mt-xlarge">
                                {submitting ? 'SYNCHRONIZING RULES...' : 'APPLY CHAMPIONSHIP POINTS'}
                            </button>
                        </div>
                    </div>
                )}

                {/* TELEMETRY TAB */}
                {activeTab === 'telemetry' && (
                    <div className="flex flex-col gap-large animate-fade-in">
                        {managingSession ? (
                            <div className="flex flex-col gap-large">
                                <div className="glass-panel" style={{ padding: '2rem' }}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-large mb-large">
                                        <div>
                                            <div className="flex items-center gap-small mb-xsmall">
                                                <div className="w-2 h-8 bg-f1-red"></div>
                                                <h2 className="h2 text-gradient">SESSION DEEP-DIVE</h2>
                                            </div>
                                            <p className="stat-label">RECORDED: {new Date(managingSession.created_at).toLocaleString().toUpperCase()}</p>
                                        </div>
                                        <div className="flex gap-medium">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Session-Zuordnung zurücksetzen? Die Teilnehmer-Zuordnungen bleiben erhalten, du kehrst nur zur Sesssion-Übersicht zurück.')) {
                                                        setManagingSession(null);
                                                    }
                                                }}
                                                className="btn btn-secondary"
                                                style={{ background: 'rgba(255,24,1,0.05)', borderColor: 'rgba(255,24,1,0.2)', color: 'var(--f1-red)' }}
                                            >
                                                RESET ALLOCATION
                                            </button>
                                            <button onClick={() => setManagingSession(null)} className="btn btn-secondary">BACK TO OVERVIEW</button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-xsmall">
                                        <h3 className="text-f1-bold mb-small" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>MAP PARTICIPANTS</h3>
                                        {sessionParticipants.map((p, idx) => (
                                            <div key={p.id} className="glass-panel" style={{ background: 'var(--f1-carbon-dark)', padding: '1rem' }}>
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-medium">
                                                    <div className="flex items-center gap-medium">
                                                        <span className="text-f1-bold" style={{ color: 'var(--f1-red)', fontSize: '1.2rem', width: '2rem' }}>{(idx + 1).toString().padStart(2, '0')}</span>
                                                        <div>
                                                            <div className="text-f1-bold" style={{ fontSize: '1rem' }}>{p.game_name.toUpperCase()} {p.is_human && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>(HUMANOID)</span>}</div>
                                                            <div className="stat-label" style={{ fontSize: '0.55rem' }}>
                                                                BEST: {p.fastest_lap_ms ? `${(p.fastest_lap_ms / 1000).toFixed(3)}S` : 'N/A'} — V-MAX: {p.top_speed ? `${p.top_speed.toFixed(1)} KM/H` : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <select
                                                        value={p.driver_id || ''}
                                                        onChange={(e) => handleAssignTelemetryPlayer(p.game_name, e.target.value)}
                                                        disabled={submitting}
                                                        className="glass-panel"
                                                        style={{
                                                            padding: '0.6rem 1rem',
                                                            background: p.driver_id ? 'rgba(0, 255, 0, 0.05)' : 'var(--glass-surface)',
                                                            border: `1px solid ${p.driver_id ? 'rgba(0, 255, 0, 0.2)' : 'var(--glass-border)'}`,
                                                            color: 'white',
                                                            fontSize: '0.8rem',
                                                            minWidth: '240px'
                                                        }}
                                                    >
                                                        <option value="" disabled style={{ color: 'black' }}>--- SELECT LEAGUE DRIVER ---</option>
                                                        {drivers.map(d => (
                                                            <option key={d.id} value={d.id} style={{ color: 'black' }}>{d.name.toUpperCase()} {d.game_name ? `(${d.game_name})` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                        {sessionParticipants.length === 0 && <p className="stat-label text-center py-large">NO TELEMETRY DATA STREAMS FOUND</p>}
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--f1-red)' }}>
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-large">
                                        <div style={{ flex: 1 }}>
                                            <h3 className="h3 text-gradient">PROMOTE TO CHAMPIONSHIP</h3>
                                            <p className="stat-label" style={{ marginTop: '0.5rem' }}>
                                                FINALIZE DATA AS AN OFFICIAL RACE RESULT. POINTS WILL BE DISTRIBUTED ACCORDING TO CURRENT REGULATIONS.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-medium">
                                            <select
                                                value={sessionPromoteTrack}
                                                onChange={e => setSessionPromoteTrack(e.target.value)}
                                                className="glass-panel"
                                                style={{ padding: '0.8rem', background: 'var(--glass-surface)', color: 'white', minWidth: '180px' }}
                                            >
                                                {F1_TRACKS_2025.map(t => <option key={t} value={t} style={{ color: 'black' }}>{t.toUpperCase()}</option>)}
                                            </select>
                                            <button
                                                onClick={handlePromoteTelemetry}
                                                disabled={submitting}
                                                className="btn btn-primary"
                                                style={{ padding: '0.8rem 2rem' }}
                                            >
                                                {submitting ? 'EXECUTING...' : 'PROMOTE NOW'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel" style={{ padding: '2rem' }}>
                                <div className="flex justify-between items-center mb-large">
                                    <div className="flex items-center gap-small">
                                        <div className="w-2 h-8 bg-f1-red"></div>
                                        <h2 className="h2 text-gradient">TELEMETRY NEXUS</h2>
                                    </div>
                                    <button onClick={() => refreshTelemetry(leagueId || '', adminPass)} className="btn btn-secondary">REFRESH STREAMS</button>
                                </div>
                                
                                <div className="flex flex-col gap-xsmall">
                                    {telemetrySessions.map(s => (
                                        <div key={s.id} className="glass-panel hover-f1 transition-all" style={{ background: 'var(--f1-carbon-dark)', padding: '1.25rem' }}>
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-medium">
                                                <div>
                                                    <div className="flex items-center gap-medium mb-xsmall">
                                                        <span className="text-f1-bold" style={{ fontSize: '1.2rem' }}>{s.session_type.toUpperCase()}</span>
                                                        {s.is_active && <span className="status-badge badge-red animate-pulse">LIVE FEED</span>}
                                                        {s.race_id && <span className="status-badge" style={{ background: 'rgba(255,24,1,0.1)', color: 'var(--f1-red)' }}>PROMOTED</span>}
                                                    </div>
                                                    <div className="stat-label" style={{ fontSize: '0.65rem' }}>
                                                        CIRCUIT: <span style={{ color: 'white' }}>{getTrackNameById(s.track_id).toUpperCase()}</span> | 
                                                        TIMESTAMP: <span style={{ color: 'white' }}>{new Date(s.created_at).toLocaleString().toUpperCase()}</span> | 
                                                        GRID: <span style={{ color: 'white' }}>{s.participants_count} DRIVERS</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-medium">
                                                    <button onClick={() => handleManageTelemetry(s.id)} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.7rem' }}>MANAGE</button>
                                                    <button onClick={() => handleDeleteTelemetry(s.id)} className="btn-danger-text">WIPE</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {telemetrySessions.length === 0 && (
                                        <div className="text-center py-xlarge opacity-50">
                                            <p className="stat-label mb-medium">NO TELEMETRY SESSIONS CAPTURED</p>
                                            <p style={{ fontSize: '0.75rem' }}>ACTIVATE F1 ROUTER TO BEGIN STREAMING DATA TO CLOUD.</p>
                                        </div>
                                    )}
                                </div>

                                {discoverableSessions.length > 0 && (
                                    <div className="mt-xlarge glass-panel" style={{ border: '1px solid rgba(255,193,7,0.2)', background: 'rgba(255,193,7,0.02)', padding: '2rem' }}>
                                        <div className="flex items-center gap-medium mb-large">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-xl">🔍</div>
                                            <div>
                                                <h3 className="text-f1-bold text-gradient" style={{ color: '#ffc107' }}>ORPHANED DATASTREAMS</h3>
                                                <p className="stat-label" style={{ fontSize: '0.6rem' }}>TELEMETRY RECOVERED FROM UNKNOWN LEAGUE IDENTIFIERS.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-xsmall">
                                            {discoverableSessions.map(s => (
                                                <div key={s.id} className="glass-panel" style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem' }}>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="text-f1-bold" style={{ color: '#ffc107' }}>{s.session_type.toUpperCase()} / {s.original_league_name.toUpperCase()}</div>
                                                            <div className="stat-label" style={{ fontSize: '0.6rem' }}>
                                                                TRACK: {getTrackNameById(s.track_id).toUpperCase()} | HUMANS: {s.human_count} | {new Date(s.created_at).toLocaleString().toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleClaimSession(s.id)} 
                                                            disabled={submitting}
                                                            className="btn btn-secondary"
                                                            style={{ borderColor: '#ffc107', color: '#ffc107', fontSize: '0.7rem' }}
                                                        >
                                                            {submitting ? 'ADOPTING...' : 'ADOPT SESSION'}
                                                        </button>
                                                    </div>
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
