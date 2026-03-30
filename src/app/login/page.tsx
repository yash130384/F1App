'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
            setError('Invalid username or password.');
            setLoading(false);
        } else {
            router.push('/profile');
            router.refresh(); // Refresh to catch new auth state
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden" 
             style={{ background: 'var(--f1-carbon-dark)' }}>
            
            {/* Background effects */}
            <div className="absolute inset-0 opacity-20" 
                 style={{ 
                    backgroundImage: 'radial-gradient(circle at 50% 50%, var(--f1-red) 0%, transparent 70%)',
                    filter: 'blur(100px)' 
                 }}></div>
            
            <div className="relative z-10 glass-panel animate-scale-in" 
                 style={{ maxWidth: '480px', width: '90%', padding: '3.5rem 2.5rem', border: '1px solid var(--glass-border)' }}>
                
                <div className="text-center mb-large">
                    <div className="inline-block mb-small">
                        <span className="text-f1-bold badge-silver" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', letterSpacing: '4px' }}>
                            SECURITY CLEARANCE
                        </span>
                    </div>
                    <h1 className="h1 text-gradient mb-xsmall" style={{ fontSize: '3rem', lineHeight: 1 }}>ACCESS HUB</h1>
                    <p className="stat-label">AUTHENTICATE TO MANAGE PROFILE AND LEAGUES</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-medium">
                    <div className="flex flex-col gap-xsmall">
                        <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DRIVER ALIAS / USERNAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="e.g. Markus Lanz"
                            className="glass-panel"
                            style={{
                                padding: '1rem',
                                width: '100%',
                                background: 'var(--glass-surface)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                outline: 'none',
                                transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--f1-red)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                        />
                    </div>
                    <div className="flex flex-col gap-xsmall">
                        <label className="text-f1-bold" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="glass-panel"
                            style={{
                                padding: '1rem',
                                width: '100%',
                                background: 'var(--glass-surface)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                outline: 'none',
                                transition: 'border-color 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--f1-red)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(255, 0, 0, 0.1)', borderLeft: '4px solid var(--f1-red)', color: '#ff6b6b', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full mt-small"
                        style={{ padding: '1.25rem', fontSize: '1rem', justifyContent: 'center', letterSpacing: '2px' }}
                    >
                        {loading ? 'AUTHENTICATING...' : 'ESTABLISH CONNECTION'}
                    </button>
                </form>

                <div className="text-center mt-large pt-medium" style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <p className="stat-label">PROTECTED BY NEXTAUTH</p>
                </div>
            </div>
        </div>
    );
}
