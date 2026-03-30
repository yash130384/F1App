'use client';

import styles from '../LeagueDashboard.module.css';

/**
 * Sidebar-Komponente für schnelle Aktionen in der Liga.
 */
export default function QuickActions() {
  return (
    <div className={`glass-panel p-6 ${styles.sidebarCard}`}>
      <h3 className={`text-f1 ${styles.sidebarSectionTitle}`}>QUICK ACTIONS</h3>
      <div className={styles.quickActionList}>
        <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>MANAGE TRACK POOL</button>
        <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>SCORING SYSTEM</button>
        <button className="btn-secondary w-full text-left" style={{ fontSize: '0.8rem' }}>INVITE CO-ADMIN</button>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
        <button className={styles.deleteBtn}>DELETE LEAGUE</button>
      </div>
    </div>
  );
}
