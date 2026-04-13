"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminLeagues } from "@/lib/actions";

export default function AdminDropdown() {
    const { data: session } = useSession();
    const [adminLeagues, setAdminLeagues] = useState<any[]>([]);
    const [isHovered, setIsHovered] = useState(false);
    
    useEffect(() => {
        if (session?.user) {
            getAdminLeagues().then(res => {
                if (res.success) {
                    setAdminLeagues(res.leagues || []);
                }
            });
        }
    }, [session]);

    if (!session || adminLeagues.length === 0) return null;

    return (
        <div 
            style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button className="nav-link" style={{color: 'var(--f1-red)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                Admin
                <span style={{fontSize: '0.7em'}}>▼</span>
            </button>
            <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                display: isHovered ? 'flex' : 'none',
                flexDirection: 'column',
                backgroundColor: 'var(--surface-mid)',
                border: '1px solid var(--surface-highest)',
                borderRadius: '4px',
                minWidth: '200px',
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                marginTop: '10px'
            }}>
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-highest)', background: 'var(--surface-lowest)', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
                    ADMINISTRATION
                </div>
                {adminLeagues.map((l: any) => (
                    <Link 
                        key={l.id} 
                        href={`/profile/leagues/${l.id}`}
                        style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', textDecoration: 'none', borderBottom: '1px solid var(--surface-highest)', transition: 'background 0.2s', display: 'block' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-highest)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {l.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
