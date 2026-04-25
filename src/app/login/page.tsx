'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            redirect: false,
            username,
            password
        });

        if (res?.error) {
            setError('INVALID CREDENTIALS. CHECK SIGNAL.');
            setLoading(false);
        } else {
            router.push('/profile');
            router.refresh();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden" 
             style={{ background: 'var(--surface-lowest)' }}>
            
            {/* Background Atmosphere */}
            <div className="absolute inset-0 opacity-30" 
                 style={{ 
                    backgroundImage: 'radial-gradient(circle at 20% 30%, var(--f1-red-glow) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--f1-cyan-glow) 0%, transparent 50%)',
                    filter: 'blur(120px)' 
                 }}></div>
            
            <div className="relative z-10 glass-panel animate-slide-up" 
                 style={{ 
                    maxWidth: '440px', 
                    width: '95%', 
                    padding: '4rem 3rem', 
                    borderRadius: '0', 
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                 }}>
                
                {/* Visual Accent */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--f1-red)' }}></div>

                <div className="mb-large">
                    <div className="flex items-center gap-small mb-xsmall">
                        <div style={{ width: '12px', height: '12px', background: 'var(--f1-red)', transform: 'skewX(-20deg)' }}></div>
                        <span className="text-f1-bold" style={{ fontSize: '0.75rem', color: 'var(--f1-red)', letterSpacing: '0.2em' }}>
                            SECURE ACCESS
                        </span>
                    </div>
                    <h1 className="h1 text-gradient" style={{ fontSize: '3.5rem', lineHeight: 0.9, marginBottom: '0.5rem' }}>
                        DRIVERS<br/>ONLY
                    </h1>
                    <p className="stat-label" style={{ opacity: 0.7 }}>ENTER COMMAND CENTER</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-medium">
                    <div className="flex flex-col gap-xsmall">
                        <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>IDENTITY / CALLSIGN</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="OPERATOR NAME"
                            className="text-mono"
                            style={{
                                padding: '1rem',
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                borderRadius: '0',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                fontSize: '0.9rem'
                            }}
                            onFocus={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'var(--f1-red)';
                                (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onBlur={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'var(--glass-border)';
                                (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.03)';
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-xsmall">
                        <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>ENCRYPTION KEY</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="text-mono"
                            style={{
                                padding: '1rem',
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                borderRadius: '0',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                fontSize: '0.9rem'
                            }}
                            onFocus={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'var(--f1-red)';
                                (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onBlur={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'var(--glass-border)';
                                (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.03)';
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ 
                            padding: '1rem', 
                            background: 'rgba(255, 24, 1, 0.1)', 
                            borderLeft: '4px solid var(--f1-red)', 
                            color: 'var(--f1-red)', 
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full"
                        style={{ padding: '1.25rem', marginTop: '1rem' }}
                    >
                        {loading ? 'SYNCING...' : 'ESTABLISH LINK'}
                    </button>
                </form>

                <div className="mt-large pt-medium flex justify-between items-center" style={{ borderTop: '1px solid var(--glass-border)', opacity: 0.8 }}>
                    <Link href="/register" className="stat-label hover:text-f1-red" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                        NEW DRIVER? ENLIST HERE
                    </Link>
                    <span className="stat-label" style={{ fontSize: '0.6rem', opacity: 0.5 }}>SECURE UPLINK</span>
                </div>
            </div>
        </div>
    );
}
