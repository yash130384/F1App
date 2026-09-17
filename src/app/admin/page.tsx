'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    verifyAdminPasscode, 
    isAdminAuthenticated, 
    logoutAdmin 
} from '@/lib/admin-auth';
import { 
    getAdminLeagues, 
    createLeague, 
    recalculateLeaguePoints 
} from '@/lib/actions';

export default function AdminPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinLoading, setPinLoading] = useState(false);

    // Admin Dashboard state
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loadingLeagues, setLoadingLeagues] = useState(false);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [creatingLeague, setCreatingLeague] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        const authed = await isAdminAuthenticated();
        setIsAuthenticated(authed);
        if (authed) {
            loadLeagues();
        }
    }

    async function loadLeagues() {
        setLoadingLeagues(true);
        const res = await getAdminLeagues();
        if (res.success) {
            setLeagues(res.leagues || []);
        }
        setLoadingLeagues(false);
    }

    async function handlePinSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pin.length !== 6) {
            setPinError('CODE MUST BE EXACTLY 6 DIGITS');
            return;
        }

        setPinLoading(true);
        setPinError('');

        const res = await verifyAdminPasscode(pin);
        if (res.success) {
            setIsAuthenticated(true);
            setPin('');
            loadLeagues();
        } else {
            setPinError(res.error || 'INVALID ACCESS CODE');
        }
        setPinLoading(false);
    }

    async function handleLogout() {
        await logoutAdmin();
        setIsAuthenticated(false);
        setPin('');
        setPinError('');
    }

    async function handleCreateLeague(e: React.FormEvent) {
        e.preventDefault();
        if (!newLeagueName.trim()) return;

        setCreatingLeague(true);
        setActionMsg(null);

        const res = await createLeague(newLeagueName.trim());
        if (res.success) {
            setActionMsg({ type: 'success', text: `Liga "${newLeagueName.trim()}" erfolgreich erstellt!` });
            setNewLeagueName('');
            loadLeagues();
        } else {
            setActionMsg({ type: 'error', text: res.error || 'Fehler beim Erstellen der Liga' });
        }
        setCreatingLeague(false);
    }

    async function handleRecalculate(leagueId: string, leagueName: string) {
        setRecalculatingId(leagueId);
        setActionMsg(null);

        const res = await recalculateLeaguePoints(leagueId);
        if (res.success) {
            setActionMsg({ type: 'success', text: `Punkte für "${leagueName}" erfolgreich neu berechnet!` });
        } else {
            setActionMsg({ type: 'error', text: res.error || 'Fehler bei der Punkte-Neuberechnung' });
        }
        setRecalculatingId(null);
    }

    if (isAuthenticated === null) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-f1-bold animate-pulse text-xl text-white tracking-widest uppercase">
                    INITIALIZING COMMAND ACCESS...
                </div>
            </div>
        );
    }

    // STATE 1: PIN-GATE (Nicht authentifiziert)
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[85vh] px-4">
                <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden" style={{ borderRadius: 0, border: '1px solid var(--glass-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
                    {/* F1 Red Accent Line */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--f1-red)' }} />

                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span style={{ width: '10px', height: '10px', background: 'var(--f1-red)', transform: 'skewX(-20deg)', display: 'inline-block' }} />
                            <span className="text-f1-bold text-xs tracking-[0.25em] text-f1-red uppercase">RESTRICTED AREA</span>
                        </div>
                        <h1 className="h1 text-gradient italic font-black" style={{ fontSize: '2.5rem', lineHeight: 1, margin: '0.5rem 0' }}>
                            RACE DIRECTOR
                        </h1>
                        <p className="text-xs text-silver/60 uppercase tracking-widest">
                            ENTER 6-DIGIT PASSCODE FOR CONTROL ACCESS
                        </p>
                    </div>

                    <form onSubmit={handlePinSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col items-center gap-2">
                            <input
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setPin(val);
                                    if (pinError) setPinError('');
                                }}
                                autoFocus
                                placeholder="••••••"
                                className="text-center font-mono font-bold tracking-[0.6em]"
                                style={{
                                    fontSize: '2.5rem',
                                    padding: '0.8rem 1rem',
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.6)',
                                    border: pinError ? '2px solid var(--f1-red)' : '1px solid var(--glass-border)',
                                    color: 'white',
                                    borderRadius: 0,
                                    outline: 'none',
                                    letterSpacing: '0.5em',
                                    transition: 'all 0.2s'
                                }}
                            />
                            <div className="text-[11px] text-silver/40 tracking-wider uppercase font-mono">
                                Security PIN required (009981)
                            </div>
                        </div>

                        {pinError && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(232, 0, 45, 0.15)',
                                borderLeft: '4px solid var(--f1-red)',
                                color: 'var(--f1-red)',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase'
                            }}>
                                ⚠ {pinError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={pinLoading || pin.length !== 6}
                            className="btn btn-primary w-full py-4 uppercase text-xs font-black tracking-[0.2em]"
                            style={{ opacity: pin.length === 6 ? 1 : 0.6 }}
                        >
                            {pinLoading ? 'VERIFYING CIPHER...' : 'UNLOCK COMMAND CENTER'}
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/dashboard" className="text-xs text-silver/50 hover:text-silver tracking-widest uppercase text-decoration-none">
                                ← Return to Public Dashboard
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // STATE 2: AUTHENTIFIZIERTES ADMIN-DASHBOARD
    const season3 = leagues.find(l => l.name === 'Season 3' || l.name?.toLowerCase().includes('season 3') || l.name?.toLowerCase().includes('season3'));

    return (
        <div className="container section-padding animate-in fade-in duration-500 pb-32">
            {/* Header with Title and Logout */}
            <div className="flex justify-between items-center flex-wrap gap-4 mb-8 pb-4 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-f1-bold text-[10px] uppercase tracking-[0.25em] text-green-400">
                            SESSION VERIFIED • SECURE SESSION ACTIVE (7 DAYS)
                        </span>
                    </div>
                    <h1 className="h1 text-gradient italic font-black" style={{ fontSize: '3rem', lineHeight: 1 }}>
                        RACE DIRECTOR HUB
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="btn btn-secondary text-xs uppercase tracking-widest">
                        Public Dashboard
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="btn text-xs uppercase tracking-widest font-black"
                        style={{ background: 'rgba(232,0,45,0.2)', border: '1px solid var(--f1-red)', color: 'var(--f1-red)' }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionMsg && (
                <div 
                    className="mb-8 p-4 rounded text-xs font-black tracking-widest uppercase flex justify-between items-center"
                    style={{ 
                        background: actionMsg.type === 'success' ? 'rgba(52, 195, 143, 0.2)' : 'rgba(232, 0, 45, 0.2)',
                        borderLeft: `4px solid ${actionMsg.type === 'success' ? '#34c38f' : 'var(--f1-red)'}`,
                        color: actionMsg.type === 'success' ? '#34c38f' : 'var(--f1-red)'
                    }}
                >
                    <span>{actionMsg.text}</span>
                    <button onClick={() => setActionMsg(null)} className="text-white opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {/* HIGHLIGHT: SEASON 3 FAST-TRACK */}
            {season3 && (
                <div className="mb-12 glass-panel p-6 relative overflow-hidden" style={{ border: '2px solid var(--f1-red)', borderRadius: 0 }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.4rem 1.2rem', background: 'var(--f1-red)', color: 'white', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                        ACTIVE CHAMPIONSHIP
                    </div>

                    <div className="mb-4">
                        <span className="text-f1-bold text-[10px] text-f1-red tracking-[0.2em] uppercase">FEATURED LEAGUE</span>
                        <h2 className="text-f1-bold text-3xl italic text-white mb-2">{season3.name}</h2>
                        <p className="text-xs text-silver/70">
                            Offizielle Meisterschaft mit den 4 Stammfahrern: <strong>kaydn87</strong>, <strong>Markus Lanz</strong>, <strong>Dox23y5</strong> und <strong>Richard David Precht</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                        <Link href={`/profile/leagues/${season3.id}`} className="btn btn-primary text-xs uppercase tracking-widest font-black">
                            ⚙ Manage League & Races
                        </Link>
                        <Link href={`/profile/leagues/${season3.id}/results`} className="btn btn-secondary text-xs uppercase tracking-widest">
                            🏁 Record Race Results
                        </Link>
                        <Link href={`/profile/leagues/${season3.id}/teams`} className="btn btn-secondary text-xs uppercase tracking-widest">
                            👤 Drivers & Teams
                        </Link>
                        <Link href={`/profile/leagues/${season3.id}/scoring`} className="btn btn-secondary text-xs uppercase tracking-widest">
                            🎯 Scoring Rules
                        </Link>
                        <button
                            onClick={() => handleRecalculate(season3.id, season3.name)}
                            disabled={recalculatingId === season3.id}
                            className="btn btn-secondary text-xs uppercase tracking-widest"
                            style={{ color: '#ffd700', borderColor: '#ffd700' }}
                        >
                            {recalculatingId === season3.id ? 'Recalculating...' : '🔄 Recalculate Points'}
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Actions & League Creation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {/* Create League Card */}
                <div className="f1-card p-6 flex flex-col justify-between">
                    <div>
                        <span className="text-f1-bold text-[10px] text-f1-red tracking-[0.2em] uppercase">ADMIN OPERATION</span>
                        <h3 className="text-f1-bold text-lg text-white mb-4 mt-1">Create New League</h3>
                        <form onSubmit={handleCreateLeague} className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={newLeagueName}
                                onChange={(e) => setNewLeagueName(e.target.value)}
                                placeholder="League Name (e.g. Season 4)"
                                className="p-3 text-xs bg-black/40 border border-white/10 text-white rounded outline-none focus:border-f1-red"
                            />
                            <button
                                type="submit"
                                disabled={creatingLeague || !newLeagueName.trim()}
                                className="btn btn-primary text-xs uppercase tracking-widest py-3"
                            >
                                {creatingLeague ? 'Creating...' : '+ Create League'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Telemetry Hub Card */}
                <div className="f1-card p-6 flex flex-col justify-between">
                    <div>
                        <span className="text-f1-bold text-[10px] text-f1-cyan tracking-[0.2em] uppercase">TELEMETRY SYSTEM</span>
                        <h3 className="text-f1-bold text-lg text-white mb-2 mt-1">Telemetry & Live Feed</h3>
                        <p className="text-xs text-silver/70 mb-4">
                            Verwalte F1 25 UDP Telemetrie-Pakete, lade Session-Dateien hoch oder beobachte den Live-Datenstrom.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/telemetryupload" className="btn btn-secondary text-xs uppercase tracking-widest flex-1 text-center">
                            Upload File
                        </Link>
                        <Link href="/live" className="btn btn-secondary text-xs uppercase tracking-widest flex-1 text-center" style={{ color: 'var(--f1-cyan)', borderColor: 'var(--f1-cyan)' }}>
                            Live Track
                        </Link>
                    </div>
                </div>

                {/* AI & MCP Card */}
                <div className="f1-card p-6 flex flex-col justify-between">
                    <div>
                        <span className="text-f1-bold text-[10px] text-purple-400 tracking-[0.2em] uppercase">AI AUTOMATION</span>
                        <h3 className="text-f1-bold text-lg text-white mb-2 mt-1">MCP Server Protocol</h3>
                        <p className="text-xs text-silver/70 mb-4">
                            Model Context Protocol (MCP) Server aktiv. KI-Agenten können Ergebnisse erfassen, Tabellen abfragen und Fahrer verwalten.
                        </p>
                    </div>
                    <div className="text-[11px] font-mono text-silver/50 p-2 bg-black/50 border border-white/5 rounded">
                        npm run mcp (Stdio Server)
                    </div>
                </div>
            </div>

            {/* All Leagues Overview */}
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-f1-bold text-xs uppercase tracking-[0.2em] text-f1-red">
                        All Leagues ({leagues.length})
                    </h2>
                    <button 
                        onClick={loadLeagues} 
                        className="text-xs text-silver/60 hover:text-white uppercase tracking-widest font-mono"
                    >
                        ↻ Refresh
                    </button>
                </div>

                {loadingLeagues ? (
                    <div className="p-8 text-center text-silver/50 uppercase tracking-widest text-xs">
                        Loading leagues...
                    </div>
                ) : leagues.length === 0 ? (
                    <div className="f1-card p-8 text-center text-silver/50 text-xs">
                        No leagues found. Create your first league above.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {leagues.map((l) => {
                            const isS3 = l.id === season3?.id;
                            return (
                                <div 
                                    key={l.id} 
                                    className="f1-card p-5 flex flex-col justify-between"
                                    style={{ 
                                        borderLeft: isS3 ? '4px solid var(--f1-red)' : '4px solid rgba(255,255,255,0.2)',
                                        background: isS3 ? 'rgba(232, 0, 45, 0.05)' : undefined 
                                    }}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-f1-bold text-lg text-white">{l.name}</h3>
                                            {isS3 && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-f1-red text-white rounded">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-silver/50 mb-4">
                                            Created: {l.createdAt ? new Date(l.createdAt).toLocaleDateString('de-DE') : '-'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                                        <div className="flex gap-2">
                                            <Link 
                                                href={`/profile/leagues/${l.id}`}
                                                className="btn btn-primary text-[10px] uppercase tracking-widest flex-1 text-center py-2"
                                            >
                                                Manage
                                            </Link>
                                            <Link 
                                                href={`/dashboard?league=${l.id}`}
                                                className="btn btn-secondary text-[10px] uppercase tracking-widest flex-1 text-center py-2"
                                            >
                                                Standings
                                            </Link>
                                        </div>
                                        <button
                                            onClick={() => handleRecalculate(l.id, l.name)}
                                            disabled={recalculatingId === l.id}
                                            className="btn btn-secondary text-[10px] uppercase tracking-widest text-center py-1.5 opacity-80 hover:opacity-100"
                                        >
                                            {recalculatingId === l.id ? 'Recalculating...' : 'Recalculate Points'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
