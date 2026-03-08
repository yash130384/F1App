'use client';

import { useState, useEffect } from 'react';
import { getUnassignedTelemetryPlayers, assignTelemetryPlayer, promoteTelemetryToRace, adminLogin, getAllLeagues } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function TelemetryAdmin() {
    const router = useRouter();
    const [leagueName, setLeagueName] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [leagueId, setLeagueId] = useState<string | null>(null);
    const [drivers, setDrivers] = useState<any[]>([]);

    const [unassigned, setUnassigned] = useState<any[]>([]);
    const [leaguesList, setLeaguesList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [selectedTrack, setSelectedTrack] = useState('');

    useEffect(() => {
        getAllLeagues().then(res => {
            if (res.success) setLeaguesList(res.leagues || []);
        });
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await adminLogin(leagueName, adminPass);
        if (res.success) {
            setLeagueId(res.leagueId);
            setDrivers(res.drivers || []);
            await fetchUnassigned(res.leagueId, adminPass);
        } else {
            setError(res.error || 'Login failed');
        }
        setLoading(false);
    };

    const fetchUnassigned = async (lId: string, pass: string) => {
        const res = await getUnassignedTelemetryPlayers(lId, pass);
        if (res.success) {
            setUnassigned(res.unassigned || []);
        }
    };

    const handleAssign = async (gameName: string, driverId: string) => {
        if (!leagueId || !driverId) return;
        setLoading(true);
        const res = await assignTelemetryPlayer(leagueId, adminPass, gameName, driverId);
        if (res.success) {
            setSuccessMsg(`Assigned ${gameName} successfully.`);
            await fetchUnassigned(leagueId, adminPass);
        } else {
            setError(res.error || 'Failed to assign player.');
        }
        setLoading(false);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handlePromote = async (sessionId: string) => {
        if (!leagueId || !selectedTrack) {
            setError('Please enter a track name before promoting.');
            return;
        }
        setLoading(true);
        const res = await promoteTelemetryToRace(leagueId, adminPass, sessionId, selectedTrack);
        if (res.success) {
            setSuccessMsg('Session promoted to Official Race successfully!');
            await fetchUnassigned(leagueId, adminPass); // Refresh list just in case
        } else {
            setError(res.error || 'Failed to promote session.');
        }
        setLoading(false);
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    if (!leagueId) {
        return (
            <div className="container" style={{ maxWidth: '500px', marginTop: '4rem' }}>
                <h1 className="text-f1 text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Telemetry AdminLogin</h1>
                <form onSubmit={handleLogin} className="f1-card flex flex-col gap-4">
                    {error && <div style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</div>}
                    <div className="flex flex-col gap-2">
                        <label className="text-f1" style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>LEAGUE</label>
                        <select
                            className="f1-input"
                            value={leagueName}
                            onChange={e => setLeagueName(e.target.value)}
                            required
                        >
                            <option value="">Select League</option>
                            {leaguesList.map(l => (
                                <option key={l.id} value={l.name}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-f1" style={{ fontSize: '0.8rem', color: 'var(--silver)' }}>ADMIN PASSWORD</label>
                        <input
                            type="password"
                            className="f1-input"
                            value={adminPass}
                            onChange={e => setAdminPass(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="f1-button" disabled={loading}>
                        {loading ? 'Authenticating...' : 'ACCESS TELEMETRY'}
                    </button>
                    <button type="button" className="btn-secondary mt-4" onClick={() => router.push('/admin')}>
                        &larr; Back to Main Admin
                    </button>
                </form>
            </div>
        );
    }

    // Group unassigned by session
    const sessionsMap = new Map<string, any[]>();
    unassigned.forEach(u => {
        if (!sessionsMap.has(u.session_id)) sessionsMap.set(u.session_id, []);
        sessionsMap.get(u.session_id)!.push(u);
    });

    return (
        <div className="container" style={{ padding: '2rem 1.5rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="text-f1 text-gradient">Telemetry Management</h1>
                <button className="btn-secondary" onClick={() => setLeagueId(null)}>Log Out</button>
            </header>

            {error && <div style={{ background: 'rgba(255,0,0,0.1)', color: 'var(--f1-red)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', borderLeft: '4px solid var(--f1-red)' }}>{error}</div>}
            {successMsg && <div style={{ background: 'rgba(0,255,0,0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', borderLeft: '4px solid var(--success)' }}>{successMsg}</div>}

            <div className="f1-card mb-6 flex flex-col gap-4">
                <h2 className="text-f1">Unassigned Players in Sessions</h2>
                <p style={{ color: 'var(--silver)', fontSize: '0.9rem' }}>
                    Map unrecognized game names (e.g. Steam names) to your registered league drivers so their results count.
                </p>

                {sessionsMap.size === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No unassigned players found in recent sessions.</div>
                ) : (
                    Array.from(sessionsMap.entries()).map(([sessionId, players]) => (
                        <div key={sessionId} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--silver)' }}>SESSION ID</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{sessionId}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--f1-red)' }}>{new Date(players[0].created_at).toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="f1-input"
                                        placeholder="Track Name (e.g. Monza)"
                                        value={selectedTrack}
                                        onChange={e => setSelectedTrack(e.target.value)}
                                        style={{ width: '200px', padding: '0.5rem' }}
                                    />
                                    <button
                                        className="f1-button"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                        onClick={() => handlePromote(sessionId)}
                                        disabled={loading}
                                    >
                                        PROMOTE TO OFFICIAL RACE
                                    </button>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '0.5rem', color: 'var(--silver)' }}>Game Name</th>
                                        <th style={{ padding: '0.5rem', color: 'var(--silver)' }}>Assign To Driver</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((p, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{p.game_name}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <select
                                                    className="f1-input"
                                                    style={{ padding: '0.3rem', width: '250px' }}
                                                    onChange={(e) => handleAssign(p.game_name, e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Select Driver...</option>
                                                    {drivers.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name} ({d.team})</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                .mb-6 { margin-bottom: 2rem; }
                .mt-4 { margin-top: 1rem; }
            `}</style>
        </div>
    );
}
