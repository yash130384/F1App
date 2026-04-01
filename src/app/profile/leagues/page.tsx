import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserLeagues } from "@/lib/actions";
import Link from 'next/link';

export default async function ManageLeaguesPage() {
    const session = await getServerSession(authOptions) as any;
    
    if (!session || !session.user) {
        return (
            <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                <h1 className="text-f1 text-gradient">UNAUTHORIZED</h1>
                <p>Please log in.</p>
            </div>
        );
    }

    const leaguesData = await getUserLeagues();
    const leagues = leaguesData.success ? (leaguesData.leagues || []) : [];

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '2.5rem', marginBottom: 0 }}>League Command Center</h1>
                <Link href="/create-league">
                    <button className="btn-primary flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        NEW LEAGUE
                    </button>
                </Link>
            </div>

            <p style={{ color: 'var(--silver)', marginBottom: '2rem', fontSize: '1.1rem' }}>
                Governing as <strong>{session.user.name}</strong>. Select a league to configure rules, add races, and manage drivers.
            </p>

            {leagues.length === 0 ? (
                <div className="f1-card flex flex-col items-center justify-center p-8 text-center border-dashed" style={{ border: '1px dashed var(--glass-border)', background: 'rgba(30,30,40,0.5)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--silver)" strokeWidth="1" opacity={0.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    <h3 className="text-f1" style={{ fontSize: '1.5rem', color: 'white', opacity: 0.8 }}>No Leagues Found</h3>
                    <p style={{ color: 'var(--silver)', marginTop: '0.5rem', opacity: 0.7 }}>You don't own any leagues currently.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {leagues.map((l: any) => (
                        <Link href={`/profile/leagues/${l.id}`} key={l.id}>
                            <div className="f1-card" style={{ borderLeft: '4px solid var(--f1-red)' }}>
                                <h2 className="text-f1 text-gradient" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{l.name}</h2>
                                <div className="flex items-center gap-2" style={{ color: 'var(--silver)', fontSize: '0.85rem', opacity: 0.8 }}>
                                    <span>Manage Rules & Data</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
