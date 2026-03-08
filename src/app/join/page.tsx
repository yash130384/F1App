'use client';

import { useState } from 'react';
import { joinLeague } from '@/lib/actions';

export default function JoinLeague() {
    const [leagueName, setLeagueName] = useState('');
    const [driverName, setDriverName] = useState('');
    const [team, setTeam] = useState('');
    const [gameName, setGameName] = useState('');
    const [color, setColor] = useState('#ffffff');
    const [joinPassword, setJoinPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await joinLeague(leagueName, joinPassword, driverName, team, color, gameName);

        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error || 'Failed to join league.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>Welcome, Driver!</h1>
                <p style={{ color: 'var(--silver)', marginBottom: '2rem' }}>
                    You have successfully joined <strong>{leagueName}</strong> as <strong>{driverName}</strong>.
                </p>
                <button className="btn-primary" style={{ marginInline: 'auto' }} onClick={() => window.location.href = '/'}>
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '600px' }}>
            <h1 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Join a League</h1>

            <form onSubmit={handleSubmit} className="f1-card flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>League Name</span>
                    <input
                        type="text"
                        value={leagueName}
                        onChange={(e) => setLeagueName(e.target.value)}
                        required
                        placeholder="Exactly as created"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Join Password</span>
                    <input
                        type="password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        required
                        placeholder="Shared by admin"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }} />

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Your Driver Name</span>
                    <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        required
                        placeholder="e.g. Max Verstappen"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Team Name (Optional)</span>
                    <input
                        type="text"
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        placeholder="e.g. Red Bull Racing"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>In-Game Name (Optional)</span>
                    <input
                        type="text"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="e.g. your Steam or PSN name"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--silver)', opacity: 0.8 }}>Required for automatic telemetry mapping during races.</span>
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Driver Color</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            style={{
                                padding: '0',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                width: '40px',
                                height: '40px'
                            }}
                        />
                        <span style={{ color: 'var(--silver)' }}>Choose a color for radar & standings</span>
                    </div>
                </label>

                {error && <p style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                >
                    {loading ? 'Joining...' : 'Enter League'}
                </button>
            </form>
        </div>
    );
}
