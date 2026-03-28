import Link from 'next/link';

export default function Home() {
  return (
    <div className="animate-slide-up">
      <header className="section-padding container text-center">
        <h1 className="h1 text-gradient" style={{ fontSize: 'min(5rem, 12vw)', lineHeight: '0.9', marginBottom: '1.5rem' }}>
          Your League.<br />
          <span style={{ color: 'var(--f1-red)' }}>Zero Effort.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'min(1.2rem, 4.5vw)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Automate scoring and manage your F1 25 league standings in seconds with a professional director's dashboard.
        </p>
        <div className="flex justify-center gap-medium">
          <Link href="/create-league" className="btn btn-primary" style={{ padding: '1rem 2,5rem', fontSize: '1rem' }}>Create League</Link>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '1rem 2,5rem', fontSize: '1rem' }}>See Standings</Link>
        </div>
      </header>

      <section className="container section-padding" style={{ background: 'var(--surface-lowest)', borderRadius: '24px' }}>
        <h2 className="h2" style={{ marginBottom: '3rem', fontSize: '1.75rem', textAlign: 'center' }}>
          The Ultimate <span style={{ color: 'var(--f1-red)' }}>Director</span> Kit
        </h2>

        <div className="grid-responsive" style={{ gap: '2rem' }}>
          <div className="f1-card" style={{ padding: '2rem' }}>
            <span className="text-f1-bold" style={{ color: 'var(--f1-red)', fontSize: '0.8rem' }}>01. Telemetry Router</span>
            <h3 className="h3" style={{ margin: '1rem 0' }}>Automated Data</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              No more manual screenshots. Our router connects directly to the game and parses race data into your league standings automatically.
            </p>
          </div>

          <div className="f1-card" style={{ padding: '2rem' }}>
            <span className="text-f1-bold" style={{ color: 'var(--f1-cyan)', fontSize: '0.8rem' }}>02. Performance Charts</span>
            <h3 className="h3" style={{ margin: '1rem 0' }}>Post-Race Analysis</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Detailed tire strategy, lap consistency, and telemetry comparison charts that look like professional broadcast graphics.
            </p>
          </div>

          <div className="f1-card" style={{ padding: '2rem' }}>
            <span className="text-f1-bold" style={{ color: 'white', fontSize: '0.8rem' }}>03. Clean Results</span>
            <h3 className="h3" style={{ margin: '1rem 0' }}>Modern Standings</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Showcase your drivers with high-fidelity leaderboards that highlight champions and track season-long point progressions.
            </p>
          </div>
        </div>
      </section>

      <footer className="container section-padding text-center" style={{ marginTop: '4rem', opacity: 0.5, fontSize: '0.8rem' }}>
        &copy; 2026 F1 25 RACING LEAGUE MANAGER. NOT AFFILIATED WITH FIA OR CODEMASTERS.
      </footer>
    </div>
  );
}
