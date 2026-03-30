'use client';

import Link from 'next/link';
import styles from '../LeagueDashboard.module.css';

interface LeagueHeaderProps {
  name: string;
  leagueId: string;
}

/**
 * Der Header der Ligaseite mit Name, ID und Schnellzugriffs-Buttons.
 */
export default function LeagueHeader({ name, leagueId }: LeagueHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={styles.badge}>OFFICIAL LEAGUE</span>
          <span className={styles.leagueId}>ID: {leagueId.slice(0, 8)}</span>
        </div>
        <h1 className={`text-f1 text-gradient ${styles.title}`}>{name}</h1>
      </div>
      
      <div className={styles.actions}>
        <Link href={`/profile/leagues/${leagueId}/results`}>
          <button className="btn-primary">ENTER RESULTS</button>
        </Link>
        <Link href={`/profile/leagues/${leagueId}/settings`}>
          <button className={`btn-secondary ${styles.settingsBtn}`}>SETTINGS</button>
        </Link>
      </div>
    </header>
  );
}
