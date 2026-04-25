'use client';

import styles from '../LeagueDashboard.module.css';
import DriverAvatar from '@/components/common/DriverAvatar';

interface Driver {
  id: string;
  name: string;
  team: string | null;
  color?: string;
  avatarUrl?: string | null;
}

interface RosterManagementProps {
  drivers: Driver[];
}

/**
 * Verwaltung des Fahrer-Rosters einer Liga.
 */
export default function RosterManagement({ drivers }: RosterManagementProps) {
  return (
    <section className="glass-panel p-6">
      <h2 className={`text-f1 ${styles.sectionTitle}`}>ROSTER MANAGEMENT</h2>
      {drivers.length === 0 ? (
        <div className={styles.emptyState}>
          <p style={{ color: 'var(--silver)' }}>No drivers registered yet.</p>
          <button className="btn-primary" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>ADD FIRST DRIVER</button>
        </div>
      ) : (
        <div className={styles.cardList}>
          {drivers.map(d => (
            <div key={d.id} className={`f1-card ${styles.driverCard}`}>
              <div className="flex items-center gap-4">
                <DriverAvatar 
                  src={d.avatarUrl} 
                  name={d.name} 
                  size={36} 
                  borderColor={d.color}
                />
                <div>
                  <div className={`text-f1 ${styles.driverName}`}>{d.name}</div>
                  <div className={styles.driverTeam}>{d.team || 'Independent'}</div>
                </div>
              </div>
              <button className={styles.removeBtn}>REMOVE</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

