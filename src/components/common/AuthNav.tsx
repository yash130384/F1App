"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthNav() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="stat-label animate-pulse">SYNCING...</div>;
    }

    if (session) {
        return (
            <div className="flex items-center gap-small">
                <Link href="/profile" className="nav-link flex items-center gap-xsmall">
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        background: (session.user as any).globalColor || 'var(--f1-red)', 
                        borderRadius: '50%' 
                    }}></div>
                    {session.user.name}
                </Link>
                <button 
                    onClick={() => signOut({ callbackUrl: '/' })} 
                    className="nav-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                >
                    LOGOUT
                </button>
                <Link href="/join" className="btn btn-primary btn-sm">JOIN LEAGUE</Link>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-small">
            <Link 
                href="https://f1-app-lknx.vercel.app/login?callbackUrl=https%3A%2F%2Ff1-app-lknx.vercel.app" 
                className="nav-link"
            >
                LOGIN
            </Link>
            <Link 
                href="/register" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem' }}
            >
                REGISTER
            </Link>
        </div>
    );
}
