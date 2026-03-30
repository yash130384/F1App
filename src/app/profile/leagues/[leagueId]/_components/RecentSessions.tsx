'use client';

import styles from '../LeagueDashboard.module.css';

/**
 * Zeigt die letzten Sessions einer Liga an.
 */
export default function RecentSessions() {
  return (
    <section className="glass-panel p-6">
      <h2 className={`text-f1 ${styles.sectionTitle}`}>RECENT SESSIONS</h2>
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--silver)', opacity: 0.5 }}>
        Race history integration coming soon.
      </div>
    </section>
  );
}
