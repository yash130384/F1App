import Link from 'next/link';

export function TelemetryNav() {
  return (
    <div className="flex items-center gap-1">
      <Link href="/telemetryupload" className="nav-link flex items-center gap-1" title="Telemetrie-Datei hochladen">
        <span style={{ fontSize: '0.85rem' }}>⬆</span>
        <span>Upload</span>
      </Link>
      <Link href="/profile/analysis" className="nav-link flex items-center gap-1" title="Telemetrie-Sessions">
        <span style={{ fontSize: '0.85rem' }}>📊</span>
        <span>Sessions</span>
      </Link>
    </div>
  );
}
