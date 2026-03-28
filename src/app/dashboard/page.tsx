'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDashboardData, getAllLeagues, getRaceDetails, deleteRace, getActiveTelemetrySession } from '@/lib/actions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import RaceCountdown, { RevealCountdown } from './RaceCountdown';
import LiveTrackMap from './LiveTrackMap';

// Props for our refactored Graph Component
interface RaceGraphContentProps {
    raceGraphData: any[];
    raceGraphDrivers: any[];
    showTyreLines: boolean;
    setShowTyreLines: React.Dispatch<React.SetStateAction<boolean>>;
    formatLapTime: (ms: number) => string;
    getTyreInfo: (id: number) => any;
    isFullscreen: boolean;
}

function RaceGraphContent({ raceGraphData, raceGraphDrivers, showTyreLines, setShowTyreLines, formatLapTime, getTyreInfo, isFullscreen }: RaceGraphContentProps) {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, boxSizing: 'border-box' }}>
            {isFullscreen && (
                <div style={{ marginBottom: '1rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowTyreLines(!showTyreLines)}
                        style={{ background: showTyreLines ? 'var(--f1-red)' : 'transparent', color: showTyreLines ? 'white' : 'var(--silver)' }}
                    >
                        {showTyreLines ? 'Hide Tyre Histories' : 'Show Tyre Histories'}
                    </button>
                </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={raceGraphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="lap_number"
                            stroke="var(--silver)"
                            tick={{ fill: 'var(--silver)', fontSize: 12 }}
                            domain={['dataMin', 'dataMax']}
                            type="number"
                            allowDecimals={false}
                        />
                        <YAxis
                            stroke="var(--silver)"
                            tick={{ fill: 'var(--silver)', fontSize: 12 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(tick) => formatLapTime(tick)}
                        />
                        {showTyreLines && (
                            <defs>
                                {raceGraphDrivers.map(driver => {
                                    const driverLaps = raceGraphData.filter(d => d[driver.id] !== undefined);
                                    if (driverLaps.length === 0) return null;

                                    const maxLap = Math.max(...driverLaps.map(d => d.lap_number));
                                    const minLap = Math.min(...driverLaps.map(d => d.lap_number));
                                    const range = maxLap - minLap;

                                    if (range === 0) return null;

                                    let stops = [];
                                    let currentTyre = driverLaps[0][`${driver.id}_current_tyre`];
                                    stops.push(<stop key="start" offset="0%" stopColor={getTyreInfo(currentTyre).color} />);

                                    driverLaps.forEach(lap => {
                                        const tyre = lap[`${driver.id}_current_tyre`];
                                        if (tyre !== currentTyre && tyre !== undefined) {
                                            const offset = `${((lap.lap_number - minLap) / range) * 100}%`;
                                            stops.push(<stop key={`stop1-${lap.lap_number}`} offset={offset} stopColor={getTyreInfo(currentTyre).color} />);
                                            stops.push(<stop key={`stop2-${lap.lap_number}`} offset={offset} stopColor={getTyreInfo(tyre).color} />);
                                            currentTyre = tyre;
                                        }
                                    });
                                    stops.push(<stop key="end" offset="100%" stopColor={getTyreInfo(currentTyre).color} />);

                                    return (
                                        <linearGradient key={`grad-${driver.id}`} id={`colorTyre-${driver.id}`} x1="0" y1="0" x2="1" y2="0">
                                            {stops}
                                        </linearGradient>
                                    );
                                })}
                            </defs>
                        )}
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--white)' }}
                            labelFormatter={(label) => `Lap ${label}`}
                            formatter={(value: any, name: any) => {
                                const driver = raceGraphDrivers.find(d => d.id === name);
                                return [formatLapTime(value), driver ? driver.name : name];
                            }}
                        />
                        {showTyreLines && raceGraphDrivers.map((driver) => (
                            <Line
                                key={`tyre-${driver.id}`}
                                type="monotone"
                                dataKey={driver.id}
                                name={driver.id}
                                stroke={`url(#colorTyre-${driver.id})`}
                                strokeWidth={6}
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                                connectNulls={true}
                                opacity={0.6}
                            />
                        ))}
                        {raceGraphDrivers.map((driver) => (
                            <Line
                                key={driver.id}
                                type="monotone"
                                dataKey={driver.id}
                                name={driver.id}
                                stroke={driver.color || 'var(--silver)'}
                                strokeWidth={4}
                                dot={false}
                                connectNulls={true}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Race Results Table Component
interface RaceResultsTableProps {
    raceResults: any[];
    handleDriverClick: (driver: any) => void;
    compact?: boolean;
}

function RaceResultsTable({ raceResults, handleDriverClick, compact = false }: RaceResultsTableProps) {
    return (
        <div className="table-container">
            <table className="f1-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>P</th>
                        <th>Driver</th>
                        {!compact && <th className="hide-mobile">Grid</th>}
                        {!compact && <th>Pits</th>}
                        <th style={{ textAlign: 'right' }}>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {raceResults.map((res, idx) => (
                        <tr 
                            key={idx} 
                            onClick={() => handleDriverClick(res)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td className="pos-number">
                                {res.position}
                            </td>
                            <td>
                                <div className="flex items-center gap-small">
                                    <div style={{ width: '3px', height: '16px', background: res.driver_color || 'var(--text-muted)', borderRadius: '1px' }} />
                                    <span className="text-f1-bold" style={{ fontSize: compact ? '0.875rem' : '1rem' }}>
                                        {res.driver_name}
                                    </span>
                                    <div className="flex gap-small">
                                        {res.fastest_lap && <span title="Fastest Lap" style={{ background: '#9c27b0', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>FL</span>}
                                        {res.clean_driver && <span title="Clean Driver" style={{ background: 'var(--f1-cyan)', color: 'black', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>CD</span>}
                                        {res.is_dnf && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>DNF</span>}
                                    </div>
                                </div>
                            </td>
                            {!compact && (
                                <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>
                                    {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                </td>
                            )}
                            {!compact && (
                                <td style={{ color: 'var(--text-secondary)' }}>
                                    {res.pit_stops > 0 ? res.pit_stops : '-'}
                                </td>
                            )}
                            <td style={{ textAlign: 'right', fontWeight: 900, color: res.is_dropped ? 'var(--text-muted)' : 'var(--f1-red)' }}>
                                <span style={{ textDecoration: res.is_dropped ? 'line-through' : 'none' }}>
                                    {res.points_earned}
                                </span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '4px', fontWeight: 400 }}>PTS</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function Dashboard() {
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
    const [league, setLeague] = useState<any | null>(null);
    const [standings, setStandings] = useState<any[]>([]);
    const [teamStandings, setTeamStandings] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [upcomingRaces, setUpcomingRaces] = useState<any[]>([]);
    const [leagueStats, setLeagueStats] = useState<any>(null);
    const [graphData, setGraphData] = useState<any[]>([]);
    const [teamGraphData, setTeamGraphData] = useState<any[]>([]);
    const [activeGraphTab, setActiveGraphTab] = useState<'driver' | 'team'>('driver');

    const [selectedRace, setSelectedRace] = useState<any | null>(null);
    const [raceResults, setRaceResults] = useState<any[]>([]);
    const [raceGraphData, setRaceGraphData] = useState<any[]>([]);
    const [raceGraphDrivers, setRaceGraphDrivers] = useState<any[]>([]);

    const [showFullScreenGraph, setShowFullScreenGraph] = useState(false);
    const [showTyreLines, setShowTyreLines] = useState(true);

    const [liveSession, setLiveSession] = useState<any | null>(null);

    const [selectedDriverDetails, setSelectedDriverDetails] = useState<any | null>(null);
    const [fetchingDriver, setFetchingDriver] = useState(false);
    const [driverPositionHistory, setDriverPositionHistory] = useState<any[]>([]);
    const [safetyCarEvents, setSafetyCarEvents] = useState<any[]>([]);
    const [sessionIdForDriver, setSessionIdForDriver] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [fetchingLeagues, setFetchingLeagues] = useState(true);
    const [fetchingRace, setFetchingRace] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    // Fetch all leagues on mount
    useEffect(() => {
        async function loadInitialLeagues() {
            setFetchingLeagues(true);
            const res = await getAllLeagues();
            if (res.success) {
                setLeaguesList(res.leagues || []);
            } else {
                setError(res.error || 'Failed to load leagues list.');
            }
            setFetchingLeagues(false);
        }
        loadInitialLeagues();
    }, []);

    const selectLeague = async (name: string) => {
        setSelectedLeagueName(name);
        setSelectedRace(null);
        setLoading(true);
        setError(null);

        const res = await getDashboardData(name);

        if (res.success) {
            setLeague(res.league);
            setStandings(res.standings || []);
            setTeamStandings(res.teamStandings || []);
            setRaces(res.races || []);
            setUpcomingRaces(res.upcoming || []);
            setGraphData(res.graphData || []);
            setTeamGraphData(res.teamGraphData || []);
            setLeagueStats(res.stats);

            // Fetch live session
            const liveRes = await getActiveTelemetrySession(res.league.id);
            if (liveRes.success && liveRes.session) {
                setLiveSession({ session: liveRes.session, participants: liveRes.participants });
            } else {
                setLiveSession(null);
            }
        } else {
            setError(res.error || 'League details not found.');
            setLeague(null);
            setLeagueStats(null);
            setGraphData([]);
            setLiveSession(null);
        }
        setLoading(false);
    };

    const selectRace = async (raceId: string) => {
        const raceToSelect = races.find(r => r.id === raceId) || upcomingRaces.find(r => r.id === raceId);
        if (raceToSelect?.is_hidden) {
            alert('Track is not revealed yet!');
            return;
        }
        setFetchingRace(true);
        const res = await getRaceDetails(raceId);
        if (res.success) {
            setSelectedRace(res.race);
            setRaceResults(res.results || []);
            setRaceGraphData([]);
            setRaceGraphDrivers([]);
        } else {
            alert(res.error || 'Failed to load race details.');
        }
        setFetchingRace(false);
    };

    // Fahrer-Klick → zur Renndetailseite navigieren
    const handleDriverClick = (driverRes: any) => {
        if (selectedRace?.id) {
            router.push(`/race/${selectedRace.id}`);
        }
    };

    const getTyreInfo = (compoundId: number) => {
        switch (compoundId) {
            case 16: return { color: '#ff0000', letter: 'S', textColor: 'white' };
            case 17: return { color: '#ffff00', letter: 'M', textColor: 'black' };
            case 18: return { color: '#ffffff', letter: 'H', textColor: 'black' };
            case 7: return { color: '#00ff00', letter: 'I', textColor: 'black' };
            case 8: return { color: '#0000ff', letter: 'W', textColor: 'white' };
            default: return { color: 'var(--silver)', letter: '?', textColor: 'black' };
        }
    };

    const formatLapTime = (ms: number) => {
        if (!ms) return '-';
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    };

    // F1 aesthetic colors for graph lines
    const colors = ['#e10600', '#00d2be', '#005aff', '#ff8700', '#ffffff', '#0090ff', '#2293d1', '#900000', '#00aa00', '#ff00ff'];

    return (
        <div className="container section-padding animate-slide-up">
            <header className="flex justify-between items-center gap-medium" style={{ marginBottom: '3rem' }}>
                <h1 className="h1 text-gradient" style={{ fontSize: '2.5rem' }}>League Center</h1>

                {selectedLeagueName && (
                    <button className="btn btn-secondary" onClick={() => { setSelectedLeagueName(null); setLeague(null); setSelectedRace(null); }}>
                        &larr; All Leagues
                    </button>
                )}
            </header>

            {error && <p style={{ color: 'var(--f1-red)', marginBottom: '1rem', fontWeight: 700 }}>{error}</p>}

            {!selectedLeagueName ? (
                <section>
                    <h2 className="h2" style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Select a League</h2>
                    {fetchingLeagues ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading championship data...</p>
                    ) : (
                        <div className="grid-responsive">
                            {leaguesList.map(l => (
                                <div
                                    key={l.id}
                                    className="f1-card"
                                    style={{ cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                                    onClick={() => selectLeague(l.name)}
                                >
                                    <span className="text-f1-bold" style={{ fontSize: '0.7rem', color: 'var(--f1-red)' }}>CHAMPIONSHIP</span>
                                    <h3 className="h3" style={{ fontSize: '1.5rem' }}>{l.name}</h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: 'auto' }}>Open Dashboard &rarr;</div>
                                </div>
                            ))}
                            {leaguesList.length === 0 && (
                                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', gridColumn: '1 / -1' }}>
                                    <p style={{ color: 'var(--text-secondary)' }}>No leagues found. Go to Admin Hub to seed data or create one!</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            ) : (
                <div className="flex flex-col gap-large">
                    {loading ? (
                        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
                            <p className="text-f1-bold animate-pulse" style={{ fontSize: '1.2rem' }}>Loading {selectedLeagueName}...</p>
                        </div>
                    ) : league && (
                        <div className="animate-fade-in flex flex-col gap-large">
                            {liveSession && (
                                <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--f1-red-glow)', background: 'rgba(255, 24, 1, 0.05)' }}>
                                    <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                        <div>
                                            <span className="text-f1-bold" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>LIVE TELEMETRY</span>
                                            <h3 className="h3" style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                                                {liveSession.session.session_type} Session
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                {liveSession.participants.length} Drivers Connected
                                            </p>
                                        </div>
                                        <div className="btn btn-primary" style={{ pointerEvents: 'none', background: 'var(--f1-red)', padding: '0.5rem 1rem' }}>
                                            LIVE
                                        </div>
                                    </div>

                                    {liveSession.participants.length > 0 && (
                                        <div className="flex gap-medium" style={{ overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem' }}>
                                            {liveSession.participants.map((p: any, idx: number) => (
                                                <div key={idx} className="f1-card" style={{ padding: '1rem', minWidth: '160px', background: 'var(--surface-lowest)' }}>
                                                    <div className="stat-label">P{p.position || '-'}</div>
                                                    <div className="text-f1-bold" style={{ fontSize: '0.9rem', margin: '4px 0' }}>{p.game_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--f1-cyan)', fontWeight: 700 }}>{p.top_speed ? `${p.top_speed} KM/H` : ''}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {liveSession.session.track_length > 0 && liveSession.participants.length > 0 && (
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
                                            <LiveTrackMap
                                                trackLength={liveSession.session.track_length}
                                                participants={liveSession.participants}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {upcomingRaces.length > 0 && (
                                <div className="flex flex-col gap-medium">
                                    <RevealCountdown race={upcomingRaces[0]} />
                                    <RaceCountdown race={upcomingRaces[0]} />
                                </div>
                            )}

                            <section>
                                <div className="flex justify-between items-end" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem' }}>
                                    <h2 className="h2" style={{ fontSize: '1.5rem' }}>
                                        Standings: <span style={{ color: 'var(--f1-red)' }}>{league.name}</span>
                                    </h2>
                                    {leagueStats && (
                                        <div className="text-right hide-mobile">
                                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{leagueStats.totalRaces}<span style={{ opacity: 0.3 }}>/</span>{leagueStats.plannedTotalRaces || '?'}</div>
                                            <div className="stat-label">Rounds Completed</div>
                                        </div>
                                    )}
                                </div>

                                <div className="f1-card">
                                    <div className="table-container">
                                        <table className="f1-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px' }}>Pos</th>
                                                    <th>Driver</th>
                                                    <th className="hide-mobile">Team</th>
                                                    <th style={{ textAlign: 'center' }}>W</th>
                                                    <th style={{ textAlign: 'center' }}>P</th>
                                                    <th className="hide-mobile" style={{ textAlign: 'center' }}>FL</th>
                                                    <th style={{ textAlign: 'right' }}>Points</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {standings.map((driver, idx) => (
                                                    <tr key={driver.id}>
                                                        <td className="pos-number">{idx + 1}</td>
                                                        <td>
                                                            <div className="flex items-center gap-small">
                                                                <div style={{ width: '3px', height: '18px', background: driver.color || 'var(--text-muted)', borderRadius: '1px' }} />
                                                                <span className="text-f1-bold" style={{ fontSize: '1.1rem' }}>{driver.name}</span>
                                                                {driver.formIndicator === 'UP' && <span style={{ color: '#00ff00' }}>↑</span>}
                                                                {driver.formIndicator === 'DOWN' && <span style={{ color: 'var(--f1-red)' }}>↓</span>}
                                                            </div>
                                                        </td>
                                                        <td className="hide-mobile" style={{ color: 'var(--text-secondary)' }}>{driver.team || 'Independent'}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{driver.wins}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{driver.podiums}</td>
                                                        <td className="hide-mobile" style={{ textAlign: 'center', fontWeight: 700 }}>{driver.fastest_laps}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--f1-red)', fontSize: '1.2rem' }}>
                                                            {driver.total_points}
                                                            {driver.raw_points !== driver.total_points && (
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 400 }}>
                                                                    ({driver.raw_points})
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {standings.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No drivers in this league yet.</div>}
                                </div>
                            </section>
                            
                            {league.config?.teamCompetition && teamStandings.length > 0 && (
                                <section>
                                    <h2 className="h2" style={{ borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                                        Team Standings
                                    </h2>
                                    <div className="f1-card">
                                        <div className="table-container">
                                            <table className="f1-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '50px' }}>Pos</th>
                                                        <th>Team</th>
                                                        <th style={{ textAlign: 'center' }}>W</th>
                                                        <th style={{ textAlign: 'right' }}>Points</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {teamStandings.map((team, idx) => (
                                                        <tr key={team.id}>
                                                            <td className="pos-number">{idx + 1}</td>
                                                            <td>
                                                                <div className="flex items-center gap-small">
                                                                    <div style={{ width: '3px', height: '18px', background: team.color || 'var(--text-muted)', borderRadius: '1px' }} />
                                                                    <span className="text-f1-bold">{team.name}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{team.wins}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--f1-red)', fontSize: '1.2rem' }}>
                                                                {team.total_points} <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>PTS</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {graphData && graphData.length > 0 && (
                                <section>
                                    <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem' }}>
                                        <h2 className="h2" style={{ fontSize: '1.5rem', margin: 0 }}>Progression</h2>
                                        {league.config?.teamCompetition && (
                                            <div className="flex glass-panel" style={{ padding: '2px', borderRadius: '4px' }}>
                                                <button 
                                                    onClick={() => setActiveGraphTab('driver')}
                                                    className="btn"
                                                    style={{ 
                                                        padding: '4px 12px', 
                                                        fontSize: '0.7rem', 
                                                        background: activeGraphTab === 'driver' ? 'var(--f1-red)' : 'transparent',
                                                        color: activeGraphTab === 'driver' ? 'white' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    DRIVER
                                                </button>
                                                <button 
                                                    onClick={() => setActiveGraphTab('team')}
                                                    className="btn"
                                                    style={{ 
                                                        padding: '4px 12px', 
                                                        fontSize: '0.7rem', 
                                                        background: activeGraphTab === 'team' ? 'var(--f1-red)' : 'transparent',
                                                        color: activeGraphTab === 'team' ? 'white' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    TEAM
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="f1-card" style={{ padding: '2rem 1.5rem 1rem 1rem' }}>
                                        <div style={{ width: '100%', height: 400 }}>
                                            <ResponsiveContainer>
                                                <LineChart data={activeGraphTab === 'driver' ? graphData : teamGraphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        stroke="var(--text-secondary)" 
                                                        fontSize={10} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                        dy={10}
                                                    />
                                                    <YAxis 
                                                        stroke="var(--text-secondary)" 
                                                        fontSize={10} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: 'var(--surface-mid)', border: '1px solid var(--glass-border)', borderRadius: '4px', fontSize: '0.8rem' }}
                                                        itemStyle={{ padding: '2px 0' }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '0.7rem', paddingTop: '20px', fontFamily: 'var(--font-display)', fontWeight: 600 }} />
                                                    {(activeGraphTab === 'driver' ? standings : teamStandings).map((item, idx) => (
                                                        <Line
                                                            key={item.id}
                                                            type="monotone"
                                                            dataKey={item.name}
                                                            stroke={item.color || `hsl(${(idx * 137.5) % 360}, 70%, 50%)`}
                                                            strokeWidth={3}
                                                            dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface-low)' }}
                                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                                            animationDuration={1500}
                                                        />
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <div className="grid-responsive" style={{ marginTop: '2rem' }}>
                                <section className="flex flex-col gap-large">
                                    {leagueStats && (leagueStats.remainingTracks?.length > 0 || leagueStats.maxDropsAllowed > 0) && (
                                        <div className="animate-fade-in flex flex-col gap-medium">
                                            <h2 className="text-f1-bold" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>CHAMPIONSHIP INFO</h2>
                                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {leagueStats.remainingTracks?.length > 0 && (
                                                    <div>
                                                        <div className="stat-label" style={{ marginBottom: '0.5rem' }}>Next Destinations</div>
                                                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.9rem', fontWeight: 500 }}>
                                                            {leagueStats.remainingTracks.join(' • ')}
                                                        </div>
                                                    </div>
                                                )}
                                                {leagueStats.actualDrops > 0 && (
                                                    <div className="flex justify-between items-center" style={{ paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                                                        <div className="stat-label">Points Regulation</div>
                                                        <div className="text-f1-bold" style={{ color: 'var(--f1-red)', fontSize: '0.9rem' }}>
                                                            {leagueStats.actualDrops} {leagueStats.actualDrops === 1 ? 'Result' : 'Results'} Dropped
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-medium">
                                        <h2 className="text-f1-bold" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>RECENT RACES</h2>
                                        <div className="flex flex-col gap-small">
                                            {races.map(race => {
                                                const isHidden = (race as any).is_hidden;
                                                return (
                                                    <div
                                                        key={race.id}
                                                        onClick={() => !isHidden && router.push(`/race/${race.id}?league=${encodeURIComponent(selectedLeagueName || '')}`)}
                                                        className={`f1-card animate-fade-in ${isHidden ? 'opacity-50' : ''}`}
                                                        style={{ 
                                                            cursor: isHidden ? 'not-allowed' : 'pointer',
                                                            padding: '1rem 1.5rem',
                                                            borderLeft: isHidden ? '4px solid var(--text-muted)' : '4px solid transparent',
                                                            transition: 'var(--transition-fast)'
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="stat-label" style={{ fontSize: '0.6rem' }} suppressHydrationWarning>{new Date(race.created_at).toLocaleDateString()}</div>
                                                                <div className="text-f1-bold" style={{ fontSize: '1.1rem', color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                                                    {isHidden ? '?? LOCKED TRACK' : (race.track || 'Unknown Grand Prix')}
                                                                </div>
                                                            </div>
                                                            {!isHidden && <div style={{ color: 'var(--f1-red)', fontSize: '1.2rem', opacity: 0.5 }}>&rarr;</div>}
                                                            {isHidden && <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>🔒</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {races.length === 0 && <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No sessions recorded yet.</div>}
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    {selectedRace ? (
                                        <div className="animate-fade-in flex flex-col gap-medium" key={selectedRace.id}>
                                            <h2 className="text-f1-bold" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', letterSpacing: '2px' }}>
                                                RACE RESULTS: {selectedRace.track}
                                            </h2>
                                            <div className="f1-card" style={{ padding: 0 }}>
                                                {fetchingRace ? (
                                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                                        <p className="text-f1-bold animate-pulse">Syncing Data...</p>
                                                    </div>
                                                ) : (
                                                    <div className="table-container">
                                                        <table className="f1-table">
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '50px' }}>Pos</th>
                                                                    <th>Driver</th>
                                                                    <th className="hide-mobile" style={{ textAlign: 'center' }}>Grid</th>
                                                                    <th className="hide-mobile" style={{ textAlign: 'center' }}>Pits</th>
                                                                    <th style={{ textAlign: 'right' }}>Points</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {raceResults.map((res, idx) => (
                                                                    <tr
                                                                        key={idx}
                                                                        onClick={() => handleDriverClick(res)}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <td className="pos-number">
                                                                             {res.position}
                                                                        </td>
                                                                        <td>
                                                                            <div className="flex items-center gap-small">
                                                                                <div style={{ width: '3px', height: '18px', background: standings.find((d: any) => d.id === res.driver_id)?.color || 'var(--text-muted)', borderRadius: '1px' }} />
                                                                                <span className="text-f1-bold">{res.driver_name}</span>
                                                                                <div className="flex gap-small">
                                                                                    {res.is_dnf && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>DNF</span>}
                                                                                    {res.fastest_lap && !res.is_dnf && <span style={{ background: '#9c27b0', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>FL</span>}
                                                                                    {res.is_dropped && <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px', fontWeight: 900 }}>DROPPED</span>}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                                            {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                                                        </td>
                                                                        <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                                            {res.pit_stops > 0 ? res.pit_stops : '-'}
                                                                        </td>
                                                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: res.is_dropped ? 'var(--text-muted)' : 'var(--f1-red)', textDecoration: res.is_dropped ? 'line-through' : 'none' }}>
                                                                                {res.points_earned}
                                                                            </span>
                                                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '3px' }}>PTS</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="glass-panel flex items-center justify-center" style={{ height: '100%', border: '1px dashed var(--glass-border)', minHeight: '300px' }}>
                                            <p className="text-f1-bold" style={{ opacity: 0.4 }}>Select a race to view details</p>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* FULL SCREEN GRAPH MODAL */}
                            {showFullScreenGraph && (
                                <div className="animate-fade-in" style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'var(--f1-carbon)', zIndex: 2000, display: 'flex',
                                    flexDirection: 'column', padding: '1rem', overflow: 'hidden'
                                }}>
                                    <div className="glass-panel flex justify-between items-center mb-4" style={{ padding: '1rem 1.5rem' }}>
                                        <h2 className="h2" style={{ margin: 0, fontSize: '1.2rem' }}>{selectedRace?.track} <span style={{ color: 'var(--f1-red)', opacity: 0.5 }}>//</span> RACE PACE ANALYSIS</h2>
                                        <button className="btn btn-secondary" onClick={() => setShowFullScreenGraph(false)}>
                                            CLOSE ESC
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-medium" style={{ flex: 1, minHeight: 0 }}>
                                        <div className="f1-card" style={{ padding: 0, maxHeight: '25vh', minHeight: '150px', overflow: 'hidden' }}>
                                            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255, 24, 1, 0.05)' }}>
                                                <span className="text-f1-bold" style={{ fontSize: '0.6rem', color: 'var(--f1-red)' }}>LIVE STANDINGS (CLICK FOR TELEMETRY)</span>
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                                <RaceResultsTable raceResults={raceResults} handleDriverClick={handleDriverClick} compact={true} />
                                            </div>
                                        </div>

                                        <div className="f1-card" style={{ flex: 1, padding: '1rem', minHeight: '250px' }}>
                                            <RaceGraphContent
                                                raceGraphData={raceGraphData}
                                                raceGraphDrivers={raceGraphDrivers}
                                                showTyreLines={showTyreLines}
                                                setShowTyreLines={setShowTyreLines}
                                                formatLapTime={formatLapTime}
                                                getTyreInfo={getTyreInfo}
                                                isFullscreen={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DRIVER MODAL */}
                            {selectedDriverDetails && (
                                <div className="animate-fade-in" style={{
                                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                    background: 'rgba(5, 5, 7, 0.9)', zIndex: 1000, display: 'flex',
                                    justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(10px)', padding: '1rem'
                                }}>
                                    <div className="f1-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderTop: '4px solid var(--f1-red)' }}>
                                        <button className="btn btn-secondary" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }} onClick={() => setSelectedDriverDetails(null)}>
                                            CLOSE
                                        </button>

                                        <div style={{ padding: '2rem' }}>
                                            <h2 className="h1" style={{ fontSize: '3rem', marginBottom: '2rem' }}>
                                                {selectedDriverDetails.summary.driver_name}
                                            </h2>

                                            <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '3rem' }}>
                                                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                    <div className="stat-label">FINISH</div>
                                                    <div className="stat-value">P{selectedDriverDetails.summary.position}</div>
                                                </div>
                                                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                    <div className="stat-label">START</div>
                                                    <div className="stat-value">P{selectedDriverDetails.summary.quali_position}</div>
                                                </div>
                                                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                    <div className="stat-label">PITS</div>
                                                    <div className="stat-value" style={{ color: selectedDriverDetails.summary.pit_stops > 0 ? 'var(--f1-cyan)' : 'var(--text-secondary)' }}>{selectedDriverDetails.summary.pit_stops}</div>
                                                </div>
                                                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                                    <div className="stat-label">PENALTY</div>
                                                    <div className="stat-value" style={{ color: selectedDriverDetails.summary.penalties_time > 0 ? 'var(--f1-red)' : 'var(--text-secondary)' }}>+{selectedDriverDetails.summary.penalties_time}s</div>
                                                </div>
                                            </div>

                                            {fetchingDriver ? (
                                                <div style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <p className="text-f1-bold animate-pulse">EXTRACTING TELEMETRY...</p>
                                                </div>
                                            ) : selectedDriverDetails.laps.length > 0 ? (
                                                <div className="flex flex-col gap-large">
                                                    <section>
                                                        <h3 className="text-f1-bold" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px', marginBottom: '1rem' }}>LAP TIME HISTORY</h3>
                                                        <div className="glass-panel" style={{ width: '100%', height: '280px', padding: '1rem' }}>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={selectedDriverDetails.laps} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                                    <XAxis dataKey="lap_number" stroke="var(--text-secondary)" fontSize={10} axisLine={false} tickLine={false} />
                                                                    <YAxis stroke="var(--text-secondary)" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(tick) => formatLapTime(tick)} width={65} />
                                                                    <Tooltip 
                                                                        contentStyle={{ backgroundColor: 'var(--surface-mid)', border: '1px solid var(--glass-border)', borderRadius: '4px' }} 
                                                                        formatter={(v: any) => [formatLapTime(v), 'Time']} 
                                                                    />
                                                                    {safetyCarEvents.filter((e: any) => e.event_type === 0).map((e: any, i: number) => (
                                                                        <ReferenceLine key={i} x={e.lap_number} stroke="var(--f1-cyan)" strokeDasharray="4 4" strokeWidth={1} label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'top', fill: 'var(--f1-cyan)', fontSize: 10 }} />
                                                                    ))}
                                                                    <Line type="monotone" dataKey="lap_time_ms" stroke="var(--f1-red)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff' }} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </section>

                                                    {/* Damage section */}
                                                    {(() => {
                                                        const damageEntries = selectedDriverDetails.laps
                                                            .filter((l: any) => l.car_damage_json)
                                                            .map((l: any) => ({ lap: l.lap_number, damage: JSON.parse(l.car_damage_json) }));
                                                        if (damageEntries.length === 0) return null;
                                                        const last = damageEntries[damageEntries.length - 1].damage;
                                                        const damages = [
                                                            { label: 'Front Wing L', val: last.frontLeftWingDamage },
                                                            { label: 'Front Wing R', val: last.frontRightWingDamage },
                                                            { label: 'Rear Wing', val: last.rearWingDamage },
                                                            { label: 'Floor', val: last.floorDamage },
                                                            { label: 'Gearbox', val: last.gearBoxDamage },
                                                            { label: 'Engine', val: last.engineDamage },
                                                        ].filter(d => d.val && d.val > 0);

                                                        if (damages.length === 0) return null;

                                                        return (
                                                            <section>
                                                                <h3 className="text-f1-bold" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px', marginBottom: '1rem' }}>TECHNICAL STATUS / DAMAGE</h3>
                                                                <div className="flex flex-wrap gap-small">
                                                                    {damages.map(d => (
                                                                        <div key={d.label} className="glass-panel" style={{ padding: '0.75rem 1.25rem', borderLeft: (d.val as number) > 20 ? '3px solid var(--f1-red)' : '3px solid var(--f1-cyan)' }}>
                                                                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{d.label}</div>
                                                                            <div style={{ fontWeight: 900, color: (d.val as number) > 20 ? 'var(--f1-red)' : 'var(--text-primary)' }}>{d.val}%</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </section>
                                                        );
                                                    })()}

                                                    <section>
                                                        <h3 className="text-f1-bold" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '2px', marginBottom: '1rem' }}>DETAILED LAPS</h3>
                                                        <div className="table-container">
                                                            <table className="f1-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Lap</th>
                                                                        <th>Time</th>
                                                                        <th className="hide-mobile">S1</th>
                                                                        <th className="hide-mobile">S2</th>
                                                                        <th className="hide-mobile">S3</th>
                                                                        <th>Tyre</th>
                                                                        <th style={{ textAlign: 'right' }}>Event</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedDriverDetails.laps.map((lap: any) => {
                                                                        const isOverallFastest = selectedDriverDetails.summary.fastest_lap &&
                                                                            lap.lap_time_ms === Math.min(...selectedDriverDetails.laps.filter((l: any) => l.is_valid).map((l: any) => l.lap_time_ms));
                                                                        return (
                                                                            <tr key={lap.lap_number}>
                                                                                <td className="pos-number" style={{ fontSize: '0.9rem' }}>{lap.lap_number}</td>
                                                                                <td className="text-f1-bold" style={{ color: isOverallFastest ? '#9c27b0' : (lap.is_valid ? 'var(--text-primary)' : 'rgba(255,24,1,0.4)') }}>
                                                                                    {formatLapTime(lap.lap_time_ms)}
                                                                                </td>
                                                                                <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{lap.sector1_ms ? formatLapTime(lap.sector1_ms) : '-'}</td>
                                                                                <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{lap.sector2_ms ? formatLapTime(lap.sector2_ms) : '-'}</td>
                                                                                <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{lap.sector3_ms ? formatLapTime(lap.sector3_ms) : '-'}</td>
                                                                                <td>
                                                                                    {lap.tyre_compound ? <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: getTyreInfo(lap.tyre_compound).color, border: '1px solid rgba(255,255,255,0.2)' }} /> : '-'}
                                                                                </td>
                                                                                <td style={{ textAlign: 'right' }}>
                                                                                    {lap.is_pit_lap && <span style={{ color: 'var(--f1-cyan)', fontSize: '0.7rem', fontWeight: 900 }}>PIT</span>}
                                                                                    {isOverallFastest && <span style={{ color: '#9c27b0', fontSize: '0.7rem', fontWeight: 900, marginLeft: '8px' }}>FASTEST</span>}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </section>
                                                </div>
                                            ) : (
                                                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                                                    <p style={{ opacity: 0.5 }}>Telemetry data unavailable for this driver.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
