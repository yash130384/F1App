'use client';

import Link from 'next/link';
import styles from '../LeagueDashboard.module.css';

/**
 * Komponente für den Ladezustand des League Dashboards.
 */
export function LoadingState() {
  return (
    <div className={styles.loadingScreen}>
      <div className="text-f1 animate-pulse">SYNCING LEAGUE DATA...</div>
    </div>
  );
}

/**
 * Komponente für Fehlzustände oder verweigerten Zugriff.
 */
export function ErrorState({ error }: { error: string }) {
  return (
    <div className={styles.errorScreen}>
      <div className="f1-card text-center p-8">
        <h1 className="text-f1 text-gradient">ACCESS DENIED</h1>
        <p style={{ color: 'var(--error)', marginTop: '1rem' }}>{error}</p>
        <Link href="/profile/leagues">
          <button className="btn-primary" style={{ marginTop: '2rem' }}>BACK TO CENTER</button>
        </Link>
      </div>
    </div>
  );
}
