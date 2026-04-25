'use client';

import styles from '../LeagueDashboard.module.css';
import Link from 'next/link';
import { useExperimental } from '@/hooks/useExperimental';

/**
 * Sidebar-Komponente für schnelle Aktionen in der Liga.
 */
export default function QuickActions({ leagueId }: { leagueId: string }) {
  const experimental = useExperimental();

  return (
    <div className={`glass-panel p-6 ${styles.sidebarCard}`}>
      <h3 className={`text-f1 ${styles.sidebarSectionTitle}`}>QUICK ACTIONS</h3>
      <div className={styles.quickActionList}>
        <Link href={`/profile/leagues/${leagueId}/teams`} className="w-full">
          <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>TEAM MANAGEMENT</button>
        </Link>
        <Link href={`/profile/leagues/${leagueId}/races`} className="w-full">
          <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>RACE CALENDAR</button>
        </Link>
        <Link href={`/profile/leagues/${leagueId}/scoring`} className="w-full">
          <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>SCORING SYSTEM</button>
        </Link>
        <Link href={`/profile/leagues/${leagueId}/settings`} className="w-full">
          <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>LEAGUE SETTINGS</button>
        </Link>
        
        {experimental && (
          <Link href={`/profile/leagues/${leagueId}/telemetry`} className="w-full">
            <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>TELEMETRY HUB</button>
          </Link>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
        <button className={styles.deleteBtn}>DELETE LEAGUE</button>
      </div>
    </div>
  );
}
