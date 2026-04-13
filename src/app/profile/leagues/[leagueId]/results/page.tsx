'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { getAdminLeagueDrivers, saveRaceResults, getRaceResults, getLeagueRaces } from '@/lib/actions';
import { calculatePoints, formatPoints } from '@/lib/scoring';
import { F1_TRACKS_2025 } from '@/lib/constants';

export default function ManualResults({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ leagueId: string }>,
    searchParams: Promise<{ raceId?: string }>
}) {
    const { leagueId } = React.use(params);
    const { raceId } = React.use(searchParams);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [track, setTrack] = useState('');
    const [activeRaceId, setActiveRaceId] = useState<string | undefined>(undefined);
    const [results, setResults] = useState<Record<string, { position: number; qualiPosition: number; fastestLap: boolean; cleanDriver: boolean; isDnf: boolean }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const driversRes = await getAdminLeagueDrivers(leagueId);
                if (!driversRes.success) throw new Error(driversRes.error);
                
                setDrivers(driversRes.drivers || []);
                
                // Set initial empty state
                const initialResults: any = {};
                (driversRes.drivers || []).forEach((d: any) => {
                    initialResults[d.id] = { position: 20, qualiPosition: 0, fastestLap: false, cleanDriver: false, isDnf: false };
                });

                let currentRaceId = raceId;
                let preSelectedTrack = '';
                
                if (!currentRaceId) {
                    const racesRes = await getLeagueRaces(leagueId);
                    if (racesRes.success && racesRes.races) {
                        const nextScheduled = racesRes.races.find((r: any) => !r.is_finished);
                        if (nextScheduled) {
                            currentRaceId = nextScheduled.id;
                            preSelectedTrack = nextScheduled.track;
                        }
                    }
                }

                if (currentRaceId) {
                    setActiveRaceId(currentRaceId);
                    const raceRes = await getRaceResults(currentRaceId);
                    if (raceRes.success && raceRes.results && raceRes.results.length > 0) {
                        setTrack(raceRes.track || '');
                        raceRes.results.forEach((r: any) => {
                            initialResults[r.driver_id] = {
                                position: r.position,
                                qualiPosition: r.quali_position || 0,
                                fastestLap: !!r.fastest_lap,
                                cleanDriver: !!r.clean_driver,
                                isDnf: !!r.is_dnf
                            };
                        });
                    } else if (preSelectedTrack) {
                        setTrack(preSelectedTrack);
                    }
                }
                
                setResults(initialResults);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        }
        
        fetchData();
    }, [leagueId, raceId]);

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

        const res = await saveRaceResults(leagueId, track, formattedResults, activeRaceId);

        if (res.success) {
            alert('Race Results Submitted!');
            window.location.href = `/profile/leagues/${leagueId}`;
        } else {
            setError(res.error || 'Failed to save results.');
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target?.result as string;
            parseCSVAndApply(csvText);
        };
        reader.readAsText(file);
    };

    const parseTime = (timeStr: string) => {
        if (!timeStr || timeStr === '-' || timeStr === '') return Infinity;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            const min = parseInt(parts[0]);
            const secParts = parts[1].replace(',', '.').split('.');
            if (secParts.length === 2) {
                const sec = parseInt(secParts[0]);
                const ms = parseInt(secParts[1]);
                return min * 60 + sec + ms / 1000;
            }
        }
        return Infinity;
    };

    const parseCSVAndApply = (csvText: string) => {
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let driverResults: any[] = [];
        let parsingSection = 0;

        for (let line of lines) {
            if (line.includes('"Pos."') && line.includes('"Fahrer"')) {
                parsingSection = 1;
                continue;
            }
            if (line.includes('"Zeit"') && line.includes('"Vorfall"')) {
                parsingSection = 2;
                continue;
            }

            if (parsingSection === 1) {
                const cols = line.match(/(?:"([^"]*)")|(?:'([^']*)')|([^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim());
                if (!cols || cols.length < 9) continue;
                
                const posStr = cols[0];
                const rawName = cols[1];
                const qualiPos = cols[3];
                const bestTimeStr = cols[5];
                const totalTimeStr = cols[6];
                
                const isDnf = totalTimeStr === 'DNF' || totalTimeStr === 'DSQ';
                const position = parseInt(posStr) || 20;
                const qPos = parseInt(qualiPos) || 0;
                
                driverResults.push({
                    name: rawName,
                    position,
                    qualiPosition: qPos,
                    bestTimeStr,
                    isDnf
                });
            }
        }

        let bestTimeMin = Infinity;
        let flDriverName: string | null = null;
        driverResults.forEach(r => {
            const t = parseTime(r.bestTimeStr);
            if (t < bestTimeMin) {
                bestTimeMin = t;
                flDriverName = r.name;
            }
        });

        const findCSVResult = (driverName: string) => {
            const normalizedTarget = driverName.toLowerCase().replace(/[\s\u00A0]+/g, ' ').trim();
            // Prefix exact match (sometimes last name is upper cased, or extra spaces)
            let match = driverResults.find(r => r.name.toLowerCase().replace(/[\s\u00A0]+/g, ' ').trim() === normalizedTarget);
            if (match) return match;
            return driverResults.find(r => r.name.toLowerCase().replace(/[\s\u00A0]+/g, ' ').includes(normalizedTarget) || normalizedTarget.includes(r.name.toLowerCase().replace(/[\s\u00A0]+/g, ' ').trim()));
        };

        setResults(prev => {
            const newResults = { ...prev };
            drivers.forEach(d => {
                const csvR = findCSVResult(d.name);
                if (csvR) {
                    newResults[d.id] = {
                        ...newResults[d.id],
                        position: csvR.position,
                        qualiPosition: csvR.qualiPosition,
                        fastestLap: flDriverName === csvR.name,
                        isDnf: csvR.isDnf
                    };
                }
            });
            return newResults;
        });
        alert('CSV Daten wurden importiert. Du kannst die Ergebnisse nun überprüfen.');
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
                <div className="flex flex-col md:flex-row gap-4" style={{ minWidth: '300px' }}>
                    <div className="input-group">
                        <label style={{ color: 'var(--f1-red)' }}>RACE LOCATION / TRACK</label>
                        <select
                            value={track}
                            onChange={e => setTrack(e.target.value)}
                            style={{ padding: '0.8rem', border: '1px solid var(--f1-red)', background: 'rgba(255, 24, 1, 0.05)', borderRadius: '4px', color: 'white', width: '100%' }}
                            disabled={loading || !!activeRaceId}
                        >
                            <option value="">-- Select Track --</option>
                            {F1_TRACKS_2025.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label style={{ color: 'var(--f1-cyan)' }}>CSV UPLOAD (OPTIONAL)</label>
                        <input 
                            type="file" 
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ padding: '0.7rem', border: '1px solid var(--f1-cyan)', background: 'rgba(0, 245, 255, 0.05)', borderRadius: '4px', color: 'white', width: '100%', cursor: 'pointer' }}
                        />
                    </div>
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
