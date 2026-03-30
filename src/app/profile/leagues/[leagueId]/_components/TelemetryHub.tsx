'use client';

import styles from '../LeagueDashboard.module.css';

/**
 * Informationsbereich für das Telemetrie-Recording.
 */
export default function TelemetryHub() {
  return (
    <div className="glass-panel p-6">
      <h3 className={`text-f1 ${styles.sidebarSectionTitle}`}>TELEMETRY HUB</h3>
      <p className={styles.telemetryText}>
        Automatic session recording is active. All authenticated results will sync here.
      </p>
      <div className={styles.statusIndicator}>
        <div className={`animate-pulse ${styles.dot}`}></div>
        RECORDER ONLINE
      </div>
    </div>
  );
}
