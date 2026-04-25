'use client';

import React, { useState, useEffect } from 'react';
import { getLeagueById, updateLeagueSettings, deleteLeague } from '@/lib/actions';
import styles from '../LeagueDashboard.module.css';
import Link from 'next/link';

export default function LeagueSettings({ params }: { params: Promise<{ leagueId: string }> }) {
    const [leagueId] = React.useState(React.use(params).leagueId);
    const [league, setLeague] = useState<any>(null);
    const [name, setName] = useState('');
    const [teamsLocked, setTeamsLocked] = useState(false);
    const [joinLocked, setJoinLocked] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await getLeagueById(leagueId);
            if (res.success && res.league) {
                setLeague(res.league);
                setName(res.league.name);
                setTeamsLocked(!!res.league.teamsLocked);
                setJoinLocked(!!res.league.joinLocked);
                setIsCompleted(!!res.league.isCompleted);
            } else {
                setError(res.error || 'League not found');
            }
            setLoading(false);
        }
        load();
    }, [leagueId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        const res = await updateLeagueSettings(leagueId, {
            name,
            teamsLocked: teamsLocked,
            joinLocked: joinLocked,
            isCompleted: isCompleted
        });

        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error);
        }
        setSaving(false);
    };

    const copyJoinLink = () => {
        const url = `${window.location.origin}/join?league=${encodeURIComponent(name)}`;
        navigator.clipboard.writeText(url);
        alert('Join link copied to clipboard!');
    };

    if (loading) return <div className="container p-12 text-center text-f1">LOADING SETTINGS...</div>;
    if (error && !league) return <div className="container p-12 text-center text-error">{error}</div>;

    return (
        <div className="container animate-fade-in p-8" style={{ maxWidth: '800px' }}>
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/profile/leagues/${leagueId}`} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                    ← BACK
                </Link>
                <h1 className="text-f1 text-3xl">LEAGUE SETTINGS</h1>
            </div>

            <form onSubmit={handleSave} className="f1-card flex flex-col gap-6">
                <section>
                    <h3 className="text-f1 mb-4" style={{ color: 'var(--f1-red)', fontSize: '0.9rem', letterSpacing: '2px' }}>GENERAL</h3>
                    <label className="flex flex-col gap-2">
                        <span style={{ color: 'var(--silver)', fontSize: '0.8rem', fontWeight: 700 }}>LEAGUE NAME</span>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="bg-carbon-900 border border-glass p-3 rounded"
                            style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                    </label>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

                <section>
                    <h3 className="text-f1 mb-4" style={{ color: 'var(--f1-red)', fontSize: '0.9rem', letterSpacing: '2px' }}>SECURITY & ACCESS</h3>
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center justify-between p-4 bg-carbon-800/30 rounded border border-glass">
                            <div className="flex flex-col">
                                <span className="font-bold">LOCK TEAMS</span>
                                <span className="text-xs text-silver">Prevents drivers from changing their team affiliation in their profile.</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={teamsLocked} 
                                onChange={(e) => setTeamsLocked(e.target.checked)}
                                style={{ width: '20px', height: '20px', accentColor: 'var(--f1-red)' }}
                            />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-carbon-800/30 rounded border border-glass">
                            <div className="flex flex-col">
                                <span className="font-bold">LOCK JOINING</span>
                                <span className="text-xs text-silver">If enabled, no new drivers can join this league via the join page.</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={joinLocked} 
                                onChange={(e) => setJoinLocked(e.target.checked)}
                                style={{ width: '20px', height: '20px', accentColor: 'var(--f1-red)' }}
                            />
                        </label>
                    </div>
                </section>

                <section>
                    <h3 className="text-f1 mb-4" style={{ color: 'var(--f1-red)', fontSize: '0.9rem', letterSpacing: '2px' }}>LEAGUE STATUS</h3>
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center justify-between p-4 bg-carbon-800/30 rounded border border-glass">
                            <div className="flex flex-col">
                                <span className="font-bold">MARK AS COMPLETED</span>
                                <span className="text-xs text-silver">Marks the league as finished. No further races or standings updates will occur.</span>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={isCompleted} 
                                onChange={(e) => setIsCompleted(e.target.checked)}
                                style={{ width: '20px', height: '20px', accentColor: 'var(--f1-red)' }}
                            />
                        </label>
                    </div>
                </section>

                <section>
                    <h3 className="text-f1 mb-4" style={{ color: 'var(--f1-red)', fontSize: '0.9rem', letterSpacing: '2px' }}>RECRUITMENT</h3>
                    <div className="flex items-center gap-4">
                        <button type="button" onClick={copyJoinLink} className="btn-secondary">
                             🔗 COPY JOIN LINK
                        </button>
                        <span className="text-xs text-silver">Share this link with drivers to let them join your league quickly.</span>
                    </div>
                </section>

                {error && <p className="text-error text-center">{error}</p>}
                {success && <p className="text-success text-center">Settings saved successfully!</p>}

                <div className="flex justify-end gap-4 mt-4">
                     <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: '150px', justifyContent: 'center' }}>
                        {saving ? 'SAVING...' : 'SAVE CHANGES'}
                     </button>
                </div>
            </form>
        </div>
    );
}
