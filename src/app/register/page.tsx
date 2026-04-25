'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/lib/auth-actions';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const res = await registerUser(formData);

        if (res.success) {
            router.push('/login?registered=true');
        } else {
            setError(res.error || 'UPLINK FAILED');
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden" 
             style={{ background: 'var(--surface-lowest)' }}>
            
            {/* Background Atmosphere */}
            <div className="absolute inset-0 opacity-30" 
                 style={{ 
                    backgroundImage: 'radial-gradient(circle at 80% 30%, var(--f1-red-glow) 0%, transparent 50%), radial-gradient(circle at 20% 70%, var(--f1-cyan-glow) 0%, transparent 50%)',
                    filter: 'blur(120px)' 
                 }}></div>
            
            <div className="relative z-10 glass-panel animate-slide-up" 
                 style={{ 
                    maxWidth: '500px', 
                    width: '95%', 
                    padding: '3rem 2.5rem', 
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
                            NEW RECRUIT
                        </span>
                    </div>
                    <h1 className="h1 text-gradient" style={{ fontSize: '3rem', lineHeight: 0.9, marginBottom: '0.5rem' }}>
                        PILOT<br/>ENLISTMENT
                    </h1>
                    <p className="stat-label" style={{ opacity: 0.7 }}>CREATE YOUR GLOBAL PROFILE</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-medium">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-medium">
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>CALLSIGN (USERNAME)</label>
                            <input
                                name="username"
                                type="text"
                                required
                                placeholder="E.G. SCHUMACHER"
                                className="input-f1"
                                style={{ fontSize: '0.8rem' }}
                            />
                        </div>
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>UPLINK (EMAIL)</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="DRIVER@TEAM.COM"
                                className="input-f1"
                                style={{ fontSize: '0.8rem' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-xsmall">
                        <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>ENCRYPTION KEY (PASSWORD)</label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="input-f1"
                            style={{ fontSize: '0.8rem' }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-medium">
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>STEAM ID (OPTIONAL)</label>
                            <input
                                name="steamName"
                                type="text"
                                placeholder="STEAM_PROFILE_NAME"
                                className="input-f1"
                                style={{ fontSize: '0.8rem' }}
                            />
                        </div>
                        <div className="flex flex-col gap-xsmall">
                            <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>GAME NAME (OPTIONAL)</label>
                            <input
                                name="gameName"
                                type="text"
                                placeholder="NAME IN F1 25"
                                className="input-f1"
                                style={{ fontSize: '0.8rem' }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="error-alert">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full"
                        style={{ padding: '1.25rem', marginTop: '1rem' }}
                    >
                        {loading ? 'PROCESSING...' : 'FINALIZE ENLISTMENT'}
                    </button>
                </form>

                <div className="mt-large pt-medium flex justify-between items-center" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <Link href="/login" className="stat-label hover:text-f1-red" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                        ALREADY ENLISTED? SIGN IN
                    </Link>
                    <span className="stat-label" style={{ fontSize: '0.6rem', opacity: 0.5 }}>ENCRYPTED UPLINK</span>
                </div>
            </div>

            <style jsx>{`
                .input-f1 {
                    padding: 0.8rem 1rem;
                    width: 100%;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    border-radius: 0;
                    outline: none;
                    transition: all 0.2s ease;
                    font-family: var(--font-mono);
                }
                .input-f1:focus {
                    border-color: var(--f1-red);
                    background: rgba(255,255,255,0.05);
                }
                .error-alert {
                    padding: 1rem;
                    background: rgba(255, 24, 1, 0.1);
                    border-left: 4px solid var(--f1-red);
                    color: var(--f1-red);
                    font-size: 0.75rem;
                    font-family: var(--font-display);
                    font-weight: 700;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
}
