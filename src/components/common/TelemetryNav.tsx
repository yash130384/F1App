'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export function TelemetryNav() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div className="flex items-center gap-1">
      <Link href="/telemetryupload" className="nav-link flex items-center gap-1" title="Telemetrie-Datei hochladen">
        <span style={{ fontSize: '0.85rem' }}>⬆</span>
        <span>Upload</span>
      </Link>
      <Link href="/profile/analysis" className="nav-link flex items-center gap-1" title="Meine Telemetrie-Sessions">
        <span style={{ fontSize: '0.85rem' }}>📊</span>
        <span>Sessions</span>
      </Link>
    </div>
  );
}
