'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDashboardData, getAllLeagues, getRaceDetails, deleteRace, getActiveTelemetrySession } from '@/lib/actions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import RaceCountdown from './RaceCountdown';
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
        <div className="flex flex-col" style={{ width: '100%' }}>
            {raceResults.map((res, idx) => (
                <div
                    key={idx}
                    className="flex justify-between items-center hover-row"
                    style={{
                        padding: compact ? '0.5rem 1rem' : '1rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        fontSize: compact ? '0.8rem' : '1rem'
                    }}
                    onClick={() => handleDriverClick(res)}
                >
                    <div className="flex items-center gap-3">
                        <span style={{ fontWeight: 900, width: '20px', color: 'var(--silver)', fontSize: compact ? '0.7rem' : '0.8rem' }}>{res.position}</span>
                        <span style={{ display: 'inline-block', width: compact ? '10px' : '12px', height: compact ? '10px' : '12px', borderRadius: '50%', backgroundColor: res.driver_color || 'var(--silver)', border: '1px solid rgba(255,255,255,0.2)' }} title="Driver Color" />
                        <span className="text-f1">{res.driver_name}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        {res.pit_stops > 0 && <span title="Pit Stops" style={{ color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 600, marginRight: '0.5rem' }}>{res.pit_stops} Pits</span>}
                        {res.penalties_time > 0 && <span title="Time Penalties" style={{ color: 'var(--f1-red)', fontSize: '0.7rem', fontWeight: 600, marginRight: '0.5rem' }}>+{res.penalties_time}s</span>}

                        {res.is_dnf ? (
                            <span style={{ color: 'var(--f1-red)', fontSize: '0.7rem', fontWeight: 900, background: 'rgba(255,24,1,0.1)', padding: '2px 8px', borderRadius: '4px' }}>DNF</span>
                        ) : (
                            <>
                                {res.fastest_lap && <span title="Fastest Lap" style={{ background: '#9c27b0', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '2px', fontWeight: 900 }}>FL</span>}
                                {res.clean_driver && <span title="Clean Driver" style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '2px', fontWeight: 900 }}>CD</span>}
                            </>
                        )}
                        {res.is_dropped && (
                            <span title="Score Dropped from Standings" style={{ color: 'var(--white)', fontSize: '0.6rem', fontWeight: 900, background: 'var(--f1-red)', padding: '2px 6px', borderRadius: '2px', marginLeft: '0.2rem' }}>
                                DROPPED
                            </span>
                        )}
                        <span style={{
                            fontWeight: 900,
                            color: res.is_dropped ? 'var(--f1-red)' : 'var(--white)',
                            marginLeft: '1rem',
                            textDecoration: res.is_dropped ? 'line-through' : 'none',
                            opacity: res.is_dropped ? 0.6 : 1,
                            fontSize: compact ? '0.8rem' : '1rem'
                        }}>
                            {res.points_earned} <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>PTS</span>
                            <span style={{ marginLeft: '0.8rem', paddingLeft: '0.8rem', borderLeft: `1px solid ${res.is_dropped ? 'rgba(255,24,1,0.2)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--silver)', fontSize: compact ? '0.7rem' : '0.8rem', textDecoration: 'none' }}>
                                P{res.position} {res.quali_position > 0 && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>(Q{res.quali_position})</span>}
                            </span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
    const [league, setLeague] = useState<any | null>(null);
    const [standings, setStandings] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [upcomingRaces, setUpcomingRaces] = useState<any[]>([]);
    const [leagueStats, setLeagueStats] = useState<any>(null);
    const [graphData, setGraphData] = useState<any[]>([]);

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
            setRaces(res.races || []);
            setUpcomingRaces(res.upcoming || []);
            setGraphData(res.graphData || []);
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
        <div className="container animate-fade-in" style={{ padding: '2rem 1.5rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '2.5rem' }}>League Center</h1>

                {selectedLeagueName && (
                    <button className="btn-secondary" onClick={() => { setSelectedLeagueName(null); setLeague(null); setSelectedRace(null); }}>
                        &larr; All Leagues
                    </button>
                )}
            </header>

            {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}

            {!selectedLeagueName ? (
                <div className="flex flex-col gap-4">
                    <h2 className="text-f1" style={{ fontSize: '1.2rem', color: 'var(--silver)' }}>Select a League</h2>
                    {fetchingLeagues ? (
                        <p style={{ color: 'var(--silver)' }}>Loading leagues...</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {leaguesList.map(l => (
                                <div
                                    key={l.id}
                                    className="f1-card hover-f1"
                                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                                    onClick={() => selectLeague(l.name)}
                                >
                                    <div style={{ fontSize: '0.7rem', color: 'var(--f1-red)', fontWeight: 900 }}>CHAMPIONSHIP</div>
                                    <div className="text-f1" style={{ fontSize: '1.5rem' }}>{l.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--silver)', textAlign: 'right', marginTop: 'auto' }}>Open Dashboard &rarr;</div>
                                </div>
                            ))}
                            {leaguesList.length === 0 && (
                                <div className="f1-card" style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
                                    <p style={{ color: 'var(--silver)' }}>No leagues found. Go to Admin Hub to seed data or create one!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="f1-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <p className="text-f1 animate-pulse">Loading {selectedLeagueName}...</p>
                        </div>
                    ) : league && (
                        <div className="dashboard-content">

                            {liveSession && (
                                <div className="f1-card animate-pulse" style={{ marginBottom: '2rem', border: '2px solid var(--f1-red)', background: 'rgba(225, 6, 0, 0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: 'var(--f1-red)', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '2px' }}>LIVE TELEMETRY</div>
                                            <h3 style={{ fontSize: '1.5rem', color: 'white', margin: '0.5rem 0' }}>
                                                {liveSession.session.session_type} Session {liveSession.session.track_id ? `(Track ID: ${liveSession.session.track_id})` : ''}
                                            </h3>
                                            <div style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>
                                                {liveSession.participants.length} Drivers Connected
                                            </div>
                                        </div>
                                        <div style={{ background: 'var(--f1-red)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                            LIVE
                                        </div>
                                    </div>

                                    {liveSession.participants.length > 0 && (
                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                            {liveSession.participants.map((p: any, idx: number) => (
                                                <div key={idx} style={{
                                                    background: 'rgba(0,0,0,0.5)',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '4px',
                                                    minWidth: '150px',
                                                    borderBottom: p.color ? `3px solid ${p.color}` : '3px solid transparent'
                                                }}>
                                                    <div style={{ color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900 }}>P{p.position || '-'}</div>
                                                    <div style={{ fontWeight: 600 }}>{p.game_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--f1-red)' }}>{p.top_speed ? `${p.top_speed} km/h` : ''}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {liveSession.session.track_length > 0 && liveSession.participants.length > 0 && (
                                        <LiveTrackMap
                                            trackLength={liveSession.session.track_length}
                                            participants={liveSession.participants}
                                        />
                                    )}
                                </div>
                            )}

                            {upcomingRaces.length > 0 && (
                                <RaceCountdown race={upcomingRaces[0]} />
                            )}
                            <section className="dashboard-standings" style={{ marginBottom: '3rem' }}>
                                <h2 className="text-f1" style={{ borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span>Standings: <span style={{ color: 'var(--f1-red)' }}>{league.name}</span></span>
                                    {leagueStats && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--silver)', fontWeight: 400 }}>
                                                {leagueStats.totalRaces} {leagueStats.plannedTotalRaces ? `/ ${leagueStats.plannedTotalRaces}` : ''} Rounds
                                            </span>
                                        </div>
                                    )}
                                </h2>

                                <div className="f1-card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                                <th style={{ padding: '1.2rem 1rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Pos</th>
                                                <th style={{ padding: '1.2rem 1rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Driver</th>
                                                <th className="hide-mobile" style={{ padding: '1.2rem 1rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Team</th>
                                                <th title="Wins" style={{ padding: '1.2rem 0.5rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textAlign: 'center' }}>W</th>
                                                <th title="Podiums" style={{ padding: '1.2rem 0.5rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textAlign: 'center' }}>P</th>
                                                <th title="Fastest Laps" className="hide-mobile" style={{ padding: '1.2rem 0.5rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textAlign: 'center' }}>FL</th>
                                                <th title="Clean Races" className="hide-mobile" style={{ padding: '1.2rem 0.5rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textAlign: 'center' }}>CD</th>
                                                <th style={{ padding: '1.2rem 1rem', color: 'var(--silver)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((driver, idx) => (
                                                <tr key={driver.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 900, fontSize: '1.4rem', fontStyle: 'italic', opacity: 0.3 }}>{idx + 1}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div className="flex items-center gap-2">
                                                            <div style={{
                                                                width: '4px',
                                                                height: '24px',
                                                                background: driver.color || 'var(--silver)',
                                                                borderRadius: '2px',
                                                                marginRight: '8px'
                                                            }} />
                                                            <div className="text-f1" style={{ fontSize: '1.1rem' }}>{driver.name}</div>
                                                            {driver.formIndicator === 'UP' && <span title="Improved Points Output" style={{ color: '#00ff00', fontSize: '1.2rem', lineHeight: 1 }}>&#8593;</span>}
                                                            {driver.formIndicator === 'DOWN' && <span title="Decreased Points Output" style={{ color: '#ff0000', fontSize: '1.2rem', lineHeight: 1 }}>&#8595;</span>}
                                                            {driver.formIndicator === 'SAME' && <span title="Constant Points Output" style={{ color: '#9c27b0', fontSize: '1.2rem', lineHeight: 1 }}>&#8722;</span>}
                                                        </div>
                                                    </td>
                                                    <td className="hide-mobile" style={{ padding: '1rem', color: 'var(--silver)' }}>{driver.team || 'Independent'}</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.wins > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.wins}</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.podiums > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.podiums}</td>
                                                    <td className="hide-mobile" style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.fastest_laps > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.fastest_laps}</td>
                                                    <td className="hide-mobile" style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.clean_races > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.clean_races}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: 'var(--f1-red)', fontSize: '1.3rem', whiteSpace: 'nowrap' }}>
                                                        {driver.total_points}
                                                        {driver.raw_points !== driver.total_points && (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--silver)', marginLeft: '6px', fontWeight: 400 }}>
                                                                ({driver.raw_points})
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {standings.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--silver)' }}>No drivers in this league yet.</div>}
                                </div>
                            </section>

                            {graphData && graphData.length > 0 && (
                                <section className="dashboard-graph animate-fade-in" style={{ marginBottom: '3rem' }}>
                                    <h2 className="text-f1" style={{ borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                                        Championship Progression
                                    </h2>
                                    <div className="f1-card" style={{ padding: '2rem 1rem', height: '400px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                                <XAxis dataKey="name" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 12 }} />
                                                <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--white)' }}
                                                    itemStyle={{ color: 'var(--white)' }}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                {standings.map((driver, idx) => (
                                                    <Line
                                                        key={driver.id}
                                                        type="monotone"
                                                        dataKey={driver.name}
                                                        stroke={driver.color || colors[idx % colors.length]}
                                                        strokeWidth={3}
                                                        dot={{ r: 4, strokeWidth: 2 }}
                                                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </section>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                <section>
                                    {leagueStats && (leagueStats.remainingTracks?.length > 0 || leagueStats.maxDropsAllowed > 0) && (
                                        <div className="mb-6 animate-fade-in">
                                            <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--f1-red)', opacity: 0.8 }}>LEAGUE INFO</h2>
                                            <div className="f1-card flex flex-col gap-3">
                                                {leagueStats.remainingTracks?.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--silver)', fontWeight: 900, marginBottom: '0.2rem' }}>REMAINING TRACKS</div>
                                                        <div style={{ color: 'white', lineHeight: 1.5, fontSize: '0.9rem' }}>
                                                            {leagueStats.remainingTracks.join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                                {leagueStats.actualDrops > 0 && (
                                                    <>
                                                        {leagueStats.remainingTracks?.length > 0 && <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />}
                                                        <div className="flex justify-between items-center">
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--silver)', fontWeight: 900 }}>DROPPED RESULTS</div>
                                                            <div style={{ color: 'var(--f1-red)', fontWeight: 'bold' }}>
                                                                {leagueStats.actualDrops} {leagueStats.actualDrops === 1 ? 'Result' : 'Results'} Dropped
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}



                                    <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--f1-red)', opacity: 0.8 }}>RECENT RACES</h2>
                                    <div className="flex flex-col gap-2">
                                        {races.map(race => (
                                            <Link
                                                key={race.id}
                                                href={`/race/${race.id}?league=${encodeURIComponent(selectedLeagueName || '')}`}
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <div
                                                    className="f1-card hover-f1 race-select-btn"
                                                    style={{ width: '100%', textAlign: 'left' }}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div style={{ fontSize: '0.6rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }} suppressHydrationWarning>{new Date(race.created_at).toLocaleDateString()}</div>
                                                            <div className="text-f1" style={{ fontSize: '1rem', color: 'var(--white)' }}>{race.track || 'Unknown Track'}</div>
                                                        </div>
                                                        <div style={{ opacity: 0.4, color: 'var(--f1-red)', fontSize: '1.2rem' }}>&rarr;</div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                        {races.length === 0 && <div className="f1-card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No races recorded.</div>}
                                    </div>
                                </section>

                                <section>
                                    {selectedRace ? (
                                        <div className="animate-fade-in" key={selectedRace.id}>
                                            <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--f1-red)', opacity: 0.8 }}>
                                                ERGEBNISSE: {selectedRace.track}
                                            </h2>
                                            <div className="f1-card" style={{ padding: 0, background: 'var(--f1-carbon-dark)', overflow: 'hidden' }}>
                                                {fetchingRace ? (
                                                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                                                        <p className="animate-pulse">Lade Ergebnisse...</p>
                                                    </div>
                                                ) : (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                                                                <th style={{ padding: '0.8rem 1rem', color: 'var(--silver)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', width: '40px' }}>Pos</th>
                                                                <th style={{ padding: '0.8rem 1rem', color: 'var(--silver)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Fahrer</th>
                                                                <th className="hide-mobile" style={{ padding: '0.8rem 0.5rem', color: 'var(--silver)', fontSize: '0.65rem', fontWeight: 900, textAlign: 'center' }}>Grid</th>
                                                                <th className="hide-mobile" style={{ padding: '0.8rem 0.5rem', color: 'var(--silver)', fontSize: '0.65rem', fontWeight: 900, textAlign: 'center' }}>Pits</th>
                                                                <th style={{ padding: '0.8rem 1rem', color: 'var(--silver)', fontSize: '0.65rem', fontWeight: 900, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '1px' }}>Punkte</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {raceResults.map((res, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    className="hover-row"
                                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                                    onClick={() => handleDriverClick(res)}
                                                                >
                                                                    <td style={{ padding: '0.9rem 1rem' }}>
                                                                        <span style={{ fontWeight: 900, fontSize: idx === 0 ? '1.3rem' : '1rem', color: idx === 0 ? 'var(--white)' : 'var(--silver)', fontStyle: 'italic', opacity: idx === 0 ? 1 : 0.5 }}>
                                                                            P{res.position}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '0.9rem 1rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <div style={{ width: '3px', height: '20px', borderRadius: '2px', background: standings.find((d: any) => d.id === res.driver_id)?.color || 'var(--silver)', flexShrink: 0 }} />
                                                                            <span className="text-f1" style={{ fontSize: '0.95rem' }}>{res.driver_name}</span>
                                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                                {res.is_dnf && <span style={{ background: 'rgba(225,6,0,0.15)', color: 'var(--f1-red)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '3px', fontWeight: 900 }}>DNF</span>}
                                                                                {res.fastest_lap && !res.is_dnf && <span title="Schnellste Runde" style={{ background: '#9c27b0', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>FL</span>}
                                                                                {res.clean_driver && !res.is_dnf && <span title="Sauberes Rennen" style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>CD</span>}
                                                                                {res.is_dropped && <span title="Ergebnis gestrichen" style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '3px', fontWeight: 900 }}>DROPPED</span>}
                                                                                {res.penalties_time > 0 && <span style={{ color: 'var(--f1-red)', fontSize: '0.65rem', fontWeight: 700 }}>+{res.penalties_time}s</span>}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="hide-mobile" style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem' }}>
                                                                        {res.quali_position > 0 ? `P${res.quali_position}` : '-'}
                                                                    </td>
                                                                    <td className="hide-mobile" style={{ padding: '0.9rem 0.5rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.8rem' }}>
                                                                        {res.pit_stops > 0 ? res.pit_stops : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: res.is_dropped ? 'rgba(225,6,0,0.5)' : 'var(--f1-red)', textDecoration: res.is_dropped ? 'line-through' : 'none' }}>
                                                                            {res.points_earned}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--silver)', marginLeft: '3px', fontWeight: 400 }}>PTS</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="f1-card flex items-center justify-center" style={{ height: '100%', border: '1px dashed var(--glass-border)', opacity: 0.3, minHeight: '200px' }}>
                                            <p style={{ fontSize: '0.9rem' }}>Rennen auswählen für Details</p>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* FULL SCREEN GRAPH MODAL */}
                            {showFullScreenGraph && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, right: 0, height: '100vh',
                                    background: 'var(--f1-carbon-dark)', zIndex: 2000, display: 'flex',
                                    flexDirection: 'column', padding: '1rem', overflow: 'hidden',
                                    boxSizing: 'border-box'
                                }}>
                                    <div className="flex justify-between items-center mb-4" style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: '0.8rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}>
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-f1" style={{ fontSize: '1.2rem', margin: 0, color: 'var(--white)' }}>{selectedRace?.track} - Full Race Pace</h2>
                                        </div>
                                        <button className="btn-secondary" onClick={() => setShowFullScreenGraph(false)}>
                                            Close X
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box' }}>
                                        {/* Results at the Top in Fullscreen */}
                                        <div className="f1-card" style={{
                                            padding: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            background: 'rgba(0,0,0,0.2)',
                                            maxHeight: '30vh',
                                            minHeight: '150px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--glass-border)',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}>
                                            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,24,1,0.05)' }}>
                                                <h3 className="text-f1" style={{ fontSize: '0.7rem', margin: 0, color: 'var(--f1-red)' }}>RACE RESULTS (CLICK DRIVER FOR DETAILS)</h3>
                                            </div>
                                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                                <RaceResultsTable raceResults={raceResults} handleDriverClick={handleDriverClick} compact={true} />
                                            </div>
                                        </div>

                                        {/* Main Graph Area Below */}
                                        <div className="f1-card" style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            padding: '0.5rem',
                                            background: 'rgba(0,0,0,0.1)',
                                            border: '1px solid var(--glass-border)',
                                            width: '100%',
                                            minHeight: '250px',
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            boxSizing: 'border-box'
                                        }}>
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
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                    background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex',
                                    justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)', padding: '2rem'
                                }}>
                                    <div className="f1-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderTop: '4px solid var(--f1-red)', background: 'linear-gradient(to bottom, #15151e 0%, #101014 100%)' }}>
                                        <button className="btn-secondary" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }} onClick={() => setSelectedDriverDetails(null)}>
                                            Close X
                                        </button>

                                        <h2 className="text-f1" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--white)' }}>
                                            {selectedDriverDetails.summary.driver_name}
                                        </h2>

                                        <div className="grid grid-4 gap-4" style={{ marginBottom: '2.5rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--silver)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Race Pos</div>
                                                <div className="text-f1" style={{ fontSize: '1.5rem' }}>P{selectedDriverDetails.summary.position}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--silver)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Grid Pos</div>
                                                <div className="text-f1" style={{ fontSize: '1.5rem' }}>P{selectedDriverDetails.summary.quali_position}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--silver)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Pit Stops</div>
                                                <div className="text-f1" style={{ fontSize: '1.5rem', color: selectedDriverDetails.summary.pit_stops > 0 ? '#ff8700' : 'var(--silver)' }}>{selectedDriverDetails.summary.pit_stops}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                <div style={{ color: 'var(--silver)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Penalties</div>
                                                <div className="text-f1" style={{ fontSize: '1.5rem', color: selectedDriverDetails.summary.penalties_time > 0 ? 'var(--f1-red)' : 'var(--success)' }}>+{selectedDriverDetails.summary.penalties_time}s</div>
                                            </div>
                                        </div>

                                        {fetchingDriver ? (
                                            <p className="animate-pulse text-center" style={{ padding: '2rem' }}>Lade Telemetrie...</p>
                                        ) : selectedDriverDetails.laps.length > 0 ? (
                                            <>
                                                {/* === RUNDENZEIT-CHART mit Safety-Car-Linien === */}
                                                <h3 className="text-f1" style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Rundenzeitverlauf</h3>
                                                <div style={{ width: '100%', height: '260px', marginBottom: '2rem' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={selectedDriverDetails.laps} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                                            <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 11 }} label={{ value: 'Runde', position: 'insideBottom', fill: 'var(--silver)', fontSize: 10, dy: 10 }} />
                                                            <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(tick) => formatLapTime(tick)} width={65} />
                                                            <Tooltip contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--white)' }} labelFormatter={(l) => `Runde ${l}`} formatter={(v: any) => [formatLapTime(v), 'Zeit']} />
                                                            {/* Safety-Car-Linien */}
                                                            {safetyCarEvents.filter((e: any) => e.event_type === 0).map((e: any, i: number) => (
                                                                <ReferenceLine key={i} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'top', fill: '#ffc107', fontSize: 9 }} />
                                                            ))}
                                                            <Line type="monotone" dataKey="lap_time_ms" stroke="var(--f1-red)" strokeWidth={2} dot={(props: any) => {
                                                                const lap = selectedDriverDetails.laps[props.index];
                                                                if (!lap.is_valid) return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="var(--f1-red)" opacity={0.4} />;
                                                                return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="var(--f1-red)" />;
                                                            }} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* === POSITIONSVERLAUF-CHART === */}
                                                {driverPositionHistory.length > 0 && (() => {
                                                    // Fahrer-Positionen per Game Name ermitteln
                                                    // Wir verwenden alle carIndex-Einträge und filtern nach Rundennummern die wir haben
                                                    const lapNums = selectedDriverDetails.laps.map((l: any) => l.lap_number);
                                                    // Alle möglichen car_index Werte für diese Rennen-Teilnehmer
                                                    const uniqueCarIndices = [...new Set(driverPositionHistory.map((p: any) => p.car_index))];
                                                    // Für jeden Teilnehmer die Grid-Startposition aus den Ergebnissen
                                                    const currentResult = selectedDriverDetails.summary;
                                                    // Finde den car_index dessen Positionsverlauf am besten passt
                                                    // (Endposition = Rennposition des Fahrers)
                                                    const driverCarIdx = uniqueCarIndices.find(ci => {
                                                        const lastLap = Math.max(...driverPositionHistory.filter((p: any) => p.car_index === ci).map((p: any) => p.lap_number));
                                                        const lastPos = driverPositionHistory.find((p: any) => p.car_index === ci && p.lap_number === lastLap)?.position;
                                                        return lastPos === currentResult.position;
                                                    }) ?? null;
                                                    if (driverCarIdx === null) return null;
                                                    const driverPosData = driverPositionHistory
                                                        .filter((p: any) => p.car_index === driverCarIdx)
                                                        .map((p: any) => ({ lap: p.lap_number, position: p.position }));
                                                    if (driverPosData.length === 0) return null;
                                                    const maxPos = Math.max(...driverPosData.map(d => d.position));
                                                    return (
                                                        <>
                                                            <h3 className="text-f1" style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Positionsverlauf</h3>
                                                            <div style={{ width: '100%', height: '200px', marginBottom: '2rem' }}>
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={driverPosData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                                                        <XAxis dataKey="lap" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 11 }} label={{ value: 'Runde', position: 'insideBottom', fill: 'var(--silver)', fontSize: 10, dy: 10 }} />
                                                                        <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 11 }} reversed={true} domain={[1, maxPos + 1]} tickFormatter={(v) => `P${v}`} width={35} />
                                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px' }} labelFormatter={(l) => `Runde ${l}`} formatter={(v: any) => [`P${v}`, 'Position']} />
                                                                        {safetyCarEvents.filter((e: any) => e.event_type === 0).map((e: any, i: number) => (
                                                                            <ReferenceLine key={i} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5} />
                                                                        ))}
                                                                        <Line type="monotone" dataKey="position" stroke="#00d2ff" strokeWidth={2} dot={{ r: 3, fill: '#00d2ff' }} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </>
                                                    );
                                                })()}

                                                {/* === SCHADENS-ANZEIGE === */}
                                                {(() => {
                                                    const damageEntries = selectedDriverDetails.laps
                                                        .filter((l: any) => l.car_damage_json)
                                                        .map((l: any) => ({ lap: l.lap_number, damage: JSON.parse(l.car_damage_json) }));
                                                    if (damageEntries.length === 0) return null;
                                                    const last = damageEntries[damageEntries.length - 1].damage;
                                                    const hasMajor = last.frontLeftWingDamage > 10 || last.frontRightWingDamage > 10 || last.rearWingDamage > 10 || last.floorDamage > 10 || last.gearBoxDamage > 10 || last.engineDamage > 10;
                                                    return (
                                                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,24,1,0.07)', borderRadius: '8px', border: '1px solid rgba(255,24,1,0.2)' }}>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--f1-red)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>⚠ Fahrzeugschäden (Final)</div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                {[
                                                                    { label: 'FL Flügel', val: last.frontLeftWingDamage },
                                                                    { label: 'FR Flügel', val: last.frontRightWingDamage },
                                                                    { label: 'Heckflügel', val: last.rearWingDamage },
                                                                    { label: 'Unterboden', val: last.floorDamage },
                                                                    { label: 'Diffusor', val: last.diffuserDamage },
                                                                    { label: 'Sidepod', val: last.sidepodDamage },
                                                                    { label: 'Getriebe', val: last.gearBoxDamage },
                                                                    { label: 'Motor', val: last.engineDamage },
                                                                    { label: 'Motor Ausfall', val: last.engineBlown ? '!' : 0 },
                                                                ].filter(d => d.val && d.val > 0).map(d => (
                                                                    <div key={d.label} style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '4px', background: (d.val as number) > 30 ? 'rgba(255,24,1,0.3)' : 'rgba(255,255,255,0.08)', color: (d.val as number) > 30 ? 'var(--f1-red)' : 'var(--silver)', fontWeight: 600 }}>
                                                                        {d.label}: {d.val}{typeof d.val === 'number' ? '%' : ''}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* === RUNDENZEITTABELLE mit Sektoren === */}
                                                <h3 className="text-f1" style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Rundenzeiten</h3>
                                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--silver)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>Rd</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>Zeit</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>S1</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>S2</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>S3</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>Reifen</th>
                                                            <th style={{ padding: '0.7rem 0.5rem' }}>Info</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedDriverDetails.laps.map((lap: any) => {
                                                            const isOverallFastest = selectedDriverDetails.summary.fastest_lap &&
                                                                lap.lap_time_ms === Math.min(...selectedDriverDetails.laps.filter((l: any) => l.is_valid).map((l: any) => l.lap_time_ms));
                                                            const hasDmg = lap.car_damage_json && JSON.parse(lap.car_damage_json).engineBlown;
                                                            return (
                                                                <tr key={lap.lap_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: hasDmg ? 'rgba(255,24,1,0.05)' : 'transparent' }}>
                                                                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--silver)', fontSize: '0.8rem' }}>{lap.lap_number}</td>
                                                                    <td style={{ padding: '0.65rem 0.5rem', color: isOverallFastest ? '#9c27b0' : (lap.is_valid ? 'var(--white)' : 'rgba(255,24,1,0.5)'), fontWeight: isOverallFastest ? 900 : 400, fontSize: '0.85rem' }}>
                                                                        {formatLapTime(lap.lap_time_ms)}
                                                                        {isOverallFastest && <span style={{ fontSize: '0.55rem', marginLeft: '5px', background: '#9c27b0', color: 'white', padding: '1px 3px', borderRadius: '2px' }}>FL</span>}
                                                                        {!lap.is_valid && <span style={{ fontSize: '0.55rem', marginLeft: '5px', color: 'var(--f1-red)' }}>INV</span>}
                                                                    </td>
                                                                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--silver)', fontSize: '0.8rem' }}>{lap.sector1_ms ? formatLapTime(lap.sector1_ms) : '-'}</td>
                                                                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--silver)', fontSize: '0.8rem' }}>{lap.sector2_ms ? formatLapTime(lap.sector2_ms) : '-'}</td>
                                                                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--silver)', fontSize: '0.8rem' }}>{lap.sector3_ms ? formatLapTime(lap.sector3_ms) : '-'}</td>
                                                                    <td style={{ padding: '0.65rem 0.5rem' }}>
                                                                        {lap.tyre_compound ? <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: getTyreInfo(lap.tyre_compound).color, border: '1px solid rgba(255,255,255,0.3)' }} title={`Compound ${lap.tyre_compound}`} /> : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '0.65rem 0.5rem' }}>
                                                                        {lap.is_pit_lap && <span style={{ background: '#ff8700', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>PIT</span>}
                                                                        {hasDmg && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, marginLeft: '3px' }}>SCHADEN</span>}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </>
                                        ) : (
                                            <p style={{ color: 'var(--silver)', textAlign: 'center', padding: '2rem' }}>Keine detaillierte Telemetrie für dieses Rennen vorhanden.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            )}

            {/* Styles */}
            <style jsx global>{`
        @media (max-width: 1024px) {
          .hide-mobile { display: none; }
        }
        .hover-row:hover {
            background: rgba(255,255,255,0.1) !important;
        }
        .race-select-btn {
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 3px solid transparent !important;
        }
        .race-select-btn:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(5px);
        }
        .race-select-btn.active {
          border-left: 3px solid var(--f1-red) !important;
          background: rgba(255,255,255,0.1);
        }
        .hover-f1:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        .animate-pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}
