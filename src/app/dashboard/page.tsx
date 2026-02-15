'use client';

import { useState, useEffect } from 'react';
import { getDashboardData, getAllLeagues, getRaceDetails, deleteRace } from '@/lib/actions';

export default function Dashboard() {
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [selectedLeagueName, setSelectedLeagueName] = useState<string | null>(null);
    const [league, setLeague] = useState<any | null>(null);
    const [standings, setStandings] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [upcomingRaces, setUpcomingRaces] = useState<any[]>([]);
    const [leagueStats, setLeagueStats] = useState<any>(null);

    const [selectedRace, setSelectedRace] = useState<any | null>(null);
    const [raceResults, setRaceResults] = useState<any[]>([]);

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
            setLeagueStats(res.stats);
        } else {
            setError(res.error || 'League details not found.');
            setLeague(null);
            setLeagueStats(null);
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
                            <section className="dashboard-standings" style={{ marginBottom: '3rem' }}>
                                <h2 className="text-f1" style={{ borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <span>Standings: <span style={{ color: 'var(--f1-red)' }}>{league.name}</span></span>
                                    {leagueStats && <span style={{ fontSize: '0.8rem', color: 'var(--silver)', fontWeight: 400 }}>{leagueStats.totalRaces} Rounds</span>}
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
                                                        <div className="text-f1" style={{ fontSize: '1.1rem' }}>{driver.name}</div>
                                                    </td>
                                                    <td className="hide-mobile" style={{ padding: '1rem', color: 'var(--silver)' }}>{driver.team || 'Independent'}</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.wins > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.wins}</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.podiums > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.podiums}</td>
                                                    <td className="hide-mobile" style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.fastest_laps > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.fastest_laps}</td>
                                                    <td className="hide-mobile" style={{ padding: '1rem 0.5rem', textAlign: 'center', fontWeight: 700, color: driver.clean_races > 0 ? 'var(--white)' : 'rgba(255,255,255,0.1)' }}>{driver.clean_races}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, color: 'var(--f1-red)', fontSize: '1.3rem' }}>{driver.total_points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {standings.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--silver)' }}>No drivers in this league yet.</div>}
                                </div>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                <section>
                                    {upcomingRaces.length > 0 && (
                                        <div className="mb-6 animate-fade-in">
                                            <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', opacity: 0.8, color: 'var(--f1-red)' }}>UPCOMING EVENTS</h2>
                                            <div className="flex flex-col gap-2">
                                                {upcomingRaces.map(race => (
                                                    <div key={race.id} className="f1-card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <div style={{ fontSize: '0.6rem', color: 'var(--silver)', marginBottom: '0.3rem' }}>
                                                            {new Date(race.scheduled_date).toLocaleString()}
                                                        </div>
                                                        <div className="text-f1" style={{ fontSize: '1.1rem' }}>{race.track}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--f1-red)', fontWeight: 900, marginTop: '0.5rem' }}>SCHEDULED</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <h2 className="text-f1" style={{ marginBottom: '1rem', fontSize: '1.2rem', opacity: 0.8 }}>Recent Races</h2>
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
                                                        <div className="text-f1" style={{ fontSize: '1rem' }}>{race.track || 'Unknown Track'}</div>
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
                                                                <div key={idx} className="flex justify-between items-center" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span style={{ fontWeight: 900, width: '20px', color: 'var(--silver)', fontSize: '0.8rem' }}>{res.position}</span>
                                                                        <span className="text-f1">{res.driver_name}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 items-center">
                                                                        {res.is_dnf ? (
                                                                            <span style={{ color: 'var(--f1-red)', fontSize: '0.7rem', fontWeight: 900, background: 'rgba(255,24,1,0.1)', padding: '2px 8px', borderRadius: '4px' }}>DNF</span>
                                                                        ) : (
                                                                            <>
                                                                                {res.fastest_lap && <span title="Fastest Lap" style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '2px', fontWeight: 900 }}>FL</span>}
                                                                                {res.clean_driver && <span title="Clean Driver" style={{ background: 'var(--success)', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '2px', fontWeight: 900 }}>CD</span>}
                                                                            </>
                                                                        )}
                                                                        <span style={{ fontWeight: 900, color: 'var(--white)', marginLeft: '1rem' }}>{res.points_earned} <span style={{ fontSize: '0.7rem', opacity: 0.3 }}>PTS</span></span>
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
                        </div>
                    )}
                </div>
            )}

            {/* Styles */}
            <style jsx global>{`
        @media (max-width: 600px) {
          .hide-mobile { display: none; }
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
