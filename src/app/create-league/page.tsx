'use client';

import { useState } from 'react';
import { createLeague } from '@/lib/actions';

export default function CreateLeague() {
    const [name, setName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [joinPassword, setJoinPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await createLeague(name, adminPassword, joinPassword);

        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error || 'Failed to create league.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>League Created!</h1>
                <p style={{ color: 'var(--silver)', marginBottom: '2rem' }}>
                    Share the <strong>Join Password</strong> with your drivers to get started.
                </p>
                <div className="f1-card" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <p style={{ color: 'var(--silver)' }}>League Name</p>
                    <p className="text-f1" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{name}</p>
                    <p style={{ color: 'var(--silver)' }}>Join Password</p>
                    <p className="text-f1" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>{joinPassword}</p>
                </div>
                <button className="btn-primary" style={{ marginTop: '2rem', marginInline: 'auto' }} onClick={() => window.location.href = '/'}>
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '600px' }}>
            <h1 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Initialize League</h1>

            <form onSubmit={handleSubmit} className="f1-card flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>League Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="e.g. Saturday Night F1"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Admin Password</span>
                    <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        placeholder="For league management"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span style={{ color: 'var(--silver)', fontSize: '0.9rem', textTransform: 'uppercase', fontWeight: 700 }}>Join Password</span>
                    <input
                        type="text"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        required
                        placeholder="Share this with drivers"
                        style={{ padding: '1rem', background: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white' }}
                    />
                </label>

                {error && <p style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                >
                    {loading ? 'Creating...' : 'Create League'}
                </button>
            </form>
        </div>
    );
}
