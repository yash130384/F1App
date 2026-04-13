'use client';

import Link from 'next/link';
import styles from '../LeagueDashboard.module.css';

interface LeagueHeaderProps {
  name: string;
  leagueId: string;
  isJoinLocked?: boolean;
  isTeamsLocked?: boolean;
}

/**
 * Der Header der Ligaseite mit Name, ID und Schnellzugriffs-Buttons.
 */
export default function LeagueHeader({ name, leagueId, isJoinLocked, isTeamsLocked }: LeagueHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={styles.badge}>OFFICIAL LEAGUE</span>
          <span className={styles.leagueId}>ID: {leagueId.slice(0, 8)}</span>
          {isJoinLocked && <span className={styles.badge} style={{ background: 'rgba(255,183,0,0.2)', color: '#ffb700', borderColor: '#ffb700' }}>JOIN LOCKED</span>}
          {isTeamsLocked && <span className={styles.badge} style={{ background: 'rgba(255,59,48,0.2)', color: '#ff3b30', borderColor: '#ff3b30' }}>TEAMS LOCKED</span>}
        </div>
        <h1 className={`text-f1 text-gradient ${styles.title}`}>{name}</h1>
      </div>
      
      <div className={styles.actions}>
        <Link href={`/profile/leagues/${leagueId}/results`}>
          <button className="btn-primary">ENTER RESULTS</button>
        </Link>
      </div>
    </header>
  );
}
