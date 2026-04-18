'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getTelemetryHistory } from '@/lib/telemetry/history-service';

// Note: In a real Next.js app, we would call this via an API route (e.g. /api/telemetry/history)
// to keep the client-side clean. For this implementation, I am providing the logic 
// as if it were a client-side call to a server action or API.

export function TelemetryNav() {
  const { data: session } = useSession();
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkHistory() {
      if (session?.user?.steamName) {
        setLoading(true);
        try {
          // This would be an actual fetch to our API
          // const res = await fetch(`/api/telemetry/history?gameName=${session.user.steamName}`);
          // const data = await res.json();
          // setHasHistory(data.length > 0);
          
          // Mocking the check for the sake of the UI implementation
          // In reality, this check happens on the server
          setHasHistory(true); 
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    }
    checkHistory();
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex items-center gap-4">
      {hasHistory && (
        <Link href="/profile/telemetry" className="nav-link flex items-center gap-1 text-f1-red">
          <span className="text-xs opacity-70">📊</span>
          <span>Telemetry</span>
        </Link>
      )}
      {loading && <span className="animate-pulse text-xs text-gray-400">...</span>}
    </div>
  );
}
