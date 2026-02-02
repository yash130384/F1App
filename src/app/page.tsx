import Link from 'next/link';

export default function Home() {
  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 className="text-f1 text-gradient" style={{ fontSize: '4rem', lineHeight: '0.9', marginBottom: '1.5rem' }}>
          Your League.<br />
          <span style={{ color: 'var(--f1-red)' }}>Zero Effort.</span>
        </h1>
        <p style={{ color: 'var(--silver)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Extract race results with AI, automate scoring, and manage your F1 25 league standings in seconds.
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/create-league" className="btn-primary" style={{ padding: '1rem 2rem' }}>Create League</Link>
          <Link href="/dashboard" className="btn-secondary" style={{ padding: '1rem 2rem' }}>See Standings</Link>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <h2 className="text-f1" style={{ fontSize: '1.5rem', borderLeft: '4px solid var(--f1-red)', paddingLeft: '1rem' }}>
          Latest Highlights
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="f1-card">
            <h3 className="text-f1" style={{ marginBottom: '1rem', color: 'var(--f1-red)' }}>Live Standings</h3>
            <p style={{ color: 'var(--silver-light)', marginBottom: '1.5rem' }}>
              Real-time leaderboard for drivers and teams. Points are calculated instantly after every race.
            </p>
            <Link href="/dashboard" className="text-f1" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', textDecoration: 'underline' }}>View Leaderboard</Link>
          </div>

          <div className="f1-card">
            <h3 className="text-f1" style={{ marginBottom: '1rem', color: 'var(--f1-red)' }}>AI Extraction</h3>
            <p style={{ color: 'var(--silver-light)', marginBottom: '1.5rem' }}>
              Upload your race recap screen. Gemini extracts positions and bonuses automatically.
            </p>
            <Link href="/admin/upload" className="text-f1" style={{ fontSize: '0.8rem', color: 'var(--f1-red)', textDecoration: 'underline' }}>Try AI Upload</Link>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '6rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center', color: 'var(--silver)', fontSize: '0.9rem' }}>
        &copy; 2026 F1 25 RACING LEAGUE MANAGER. NOT AFFILIATED WITH FIA OR CODEMASTERS.
      </footer>
    </div>
  );
}
