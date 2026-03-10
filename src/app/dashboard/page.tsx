'use client';

import { useState, useEffect } from 'react';
import { getDashboardData, getAllLeagues, getRaceDetails, deleteRace, getActiveTelemetrySession, getDriverRaceTelemetry } from '@/lib/actions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import RaceCountdown from './RaceCountdown';
import LiveTrackMap from './LiveTrackMap';

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

    const [liveSession, setLiveSession] = useState<any | null>(null);

    const [selectedDriverDetails, setSelectedDriverDetails] = useState<any | null>(null);
    const [fetchingDriver, setFetchingDriver] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetchingLeagues, setFetchingLeagues] = useState(true);
    const [fetchingRace, setFetchingRace] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } else {
            alert(res.error || 'Failed to load race details.');
        }
        setFetchingRace(false);
    };

    const handleDriverClick = async (driverRes: any) => {
        if (!selectedRace) return;
        setFetchingDriver(true);
        setSelectedDriverDetails({ summary: driverRes, laps: [] }); // Opening modal early with loading state

        const res = await getDriverRaceTelemetry(selectedRace.id, driverRes.driver_id);
        if (res.success) {
            setSelectedDriverDetails({ summary: driverRes, laps: res.laps || [] });
        } else {
            alert('Failed to load lap telemetry for this driver.');
            setSelectedDriverDetails(null);
        }
        setFetchingDriver(false);
    };

    const getTyreColor = (compoundId: number) => {
        switch (compoundId) {
            case 16: // C5 (Softest)
            case 17: // C4
            case 18: // C3
                return '#ff0000'; // Red
            case 19: // C2
                return '#ffff00'; // Yellow
            case 20: // C1 (Hardest)
                return '#ffffff'; // White
            case 7: // Inter
                return '#00ff00'; // Green
            case 8: // Wet
                return '#0000ff'; // Blue
            default:
                return 'var(--silver)';
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
                                            <button
                                                key={race.id}
                                                className={`f1-card race-select-btn ${selectedRace?.id === race.id ? 'active' : ''}`}
                                                onClick={() => selectRace(race.id)}
                                                style={{ width: '100%', textAlign: 'left', border: 'none' }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div style={{ fontSize: '0.6rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }} suppressHydrationWarning>{new Date(race.created_at).toLocaleDateString()}</div>
                                                        <div className="text-f1" style={{ fontSize: '1rem', color: 'var(--white)' }}>{race.track || 'Unknown Track'}</div>
                                                    </div>
                                                    <div style={{ opacity: selectedRace?.id === race.id ? 1 : 0.3 }}>&rarr;</div>
                                                </div>
                                            </button>
                                        ))}
                                        {races.length === 0 && <div className="f1-card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No races recorded.</div>}
                                    </div>
                                </section>

                                <section>
                                    {selectedRace ? (
                                        <div className="animate-fade-in" key={selectedRace.id}>
                                            <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--f1-red)' }}>
                                                {selectedRace.track} Results
                                            </h2>
                                            <div className="f1-card" style={{ padding: 0, background: 'var(--f1-carbon-dark)', overflow: 'hidden' }}>
                                                {fetchingRace ? (
                                                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                                                        <p className="animate-pulse">Loading results...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex flex-col">
                                                            {raceResults.map((res, idx) => (
                                                                <div key={idx} className="flex justify-between items-center hover-row" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => handleDriverClick(res)}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span style={{ fontWeight: 900, width: '20px', color: 'var(--silver)', fontSize: '0.8rem' }}>{res.position}</span>
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
                                                                            opacity: res.is_dropped ? 0.6 : 1
                                                                        }}>
                                                                            {res.points_earned} <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>PTS</span>
                                                                            <span style={{ marginLeft: '0.8rem', paddingLeft: '0.8rem', borderLeft: `1px solid ${res.is_dropped ? 'rgba(255,24,1,0.2)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--silver)', fontSize: '0.8rem', textDecoration: 'none' }}>
                                                                                P{res.position} {res.quali_position > 0 && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>(Q{res.quali_position})</span>}
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="f1-card flex items-center justify-center" style={{ height: '100%', border: '1px dashed var(--glass-border)', opacity: 0.3, minHeight: '200px' }}>
                                            <p style={{ fontSize: '0.9rem' }}>Select a race to view details</p>
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* DRIVER MODAL */}
                            {selectedDriverDetails && (
                                <div style={{
                                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                                    background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex',
                                    justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)', padding: '2rem'
                                }}>
                                    <div className="f1-card animate-fade-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                                        <button className="btn-secondary" style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={() => setSelectedDriverDetails(null)}>
                                            Close X
                                        </button>

                                        <h2 className="text-f1" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                                            {selectedDriverDetails.summary.driver_name}
                                        </h2>
                                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--silver)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                            <span>Position: P{selectedDriverDetails.summary.position}</span>
                                            <span>Grid: P{selectedDriverDetails.summary.quali_position}</span>
                                            {selectedDriverDetails.summary.pit_stops > 0 && <span>Pits: {selectedDriverDetails.summary.pit_stops}</span>}
                                            {selectedDriverDetails.summary.penalties_time > 0 && <span style={{ color: 'var(--f1-red)' }}>Penalties: +{selectedDriverDetails.summary.penalties_time}s</span>}
                                            {selectedDriverDetails.summary.warnings > 0 && <span style={{ color: '#ff8700' }}>Warnings: {selectedDriverDetails.summary.warnings}</span>}
                                        </div>

                                        {fetchingDriver ? (
                                            <p className="animate-pulse text-center" style={{ padding: '2rem' }}>Loading lap telemetry...</p>
                                        ) : selectedDriverDetails.laps.length > 0 ? (
                                            <>
                                                <div style={{ width: '100%', height: '300px', marginBottom: '2rem' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={selectedDriverDetails.laps} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                                            <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 12 }} />
                                                            <YAxis
                                                                stroke="var(--silver)"
                                                                tick={{ fill: 'var(--silver)', fontSize: 12 }}
                                                                domain={['auto', 'auto']}
                                                                tickFormatter={(tick) => formatLapTime(tick)}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--white)' }}
                                                                labelFormatter={(label) => `Lap ${label}`}
                                                                formatter={(value: any) => [formatLapTime(value), 'Lap Time']}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey="lap_time_ms"
                                                                stroke="var(--f1-red)"
                                                                strokeWidth={2}
                                                                dot={{ r: 3, strokeWidth: 1 }}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <h3 className="text-f1" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Timetable</h3>
                                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--silver)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                                            <th style={{ padding: '0.8rem' }}>Lap</th>
                                                            <th style={{ padding: '0.8rem' }}>Time</th>
                                                            <th style={{ padding: '0.8rem' }}>Tyre</th>
                                                            <th style={{ padding: '0.8rem' }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedDriverDetails.laps.map((lap: any) => {
                                                            const isOverallFastest = selectedDriverDetails.summary.fastest_lap &&
                                                                lap.lap_time_ms === Math.min(...selectedDriverDetails.laps.filter((l: any) => l.is_valid).map((l: any) => l.lap_time_ms));

                                                            return (
                                                                <tr key={lap.lap_number} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <td style={{ padding: '0.8rem' }}>{lap.lap_number}</td>
                                                                    <td style={{
                                                                        padding: '0.8rem',
                                                                        color: isOverallFastest ? '#9c27b0' : (lap.is_valid ? 'var(--white)' : 'var(--f1-red)'),
                                                                        fontWeight: isOverallFastest ? 900 : (lap.is_valid ? 400 : 700)
                                                                    }}>
                                                                        {formatLapTime(lap.lap_time_ms)}
                                                                        {!lap.is_valid && <span style={{ fontSize: '0.6rem', marginLeft: '6px' }}>(Invalid)</span>}
                                                                        {isOverallFastest && <span style={{ fontSize: '0.6rem', marginLeft: '6px', background: '#9c27b0', color: 'white', padding: '2px 4px', borderRadius: '2px' }}>FL</span>}
                                                                    </td>
                                                                    <td style={{ padding: '0.8rem' }}>
                                                                        {lap.tyre_compound ? (
                                                                            <span style={{
                                                                                display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%',
                                                                                background: getTyreColor(lap.tyre_compound),
                                                                                border: '1px solid rgba(255,255,255,0.3)',
                                                                                marginRight: '6px'
                                                                            }} title={`Tyre Compound ID: ${lap.tyre_compound}`} />
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '0.8rem' }}>
                                                                        {lap.is_pit_lap && <span style={{ background: '#ff8700', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>PIT</span>}
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
        @media (max-width: 600px) {
          .hide-mobile { display: none; }
          .container { padding: 1rem 0.5rem !important; }
          .dashboard-standings table th, .dashboard-standings table td { padding: 0.8rem 0.4rem !important; }
          .dashboard-standings table td:last-child { padding-right: 0.8rem !important; }
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
