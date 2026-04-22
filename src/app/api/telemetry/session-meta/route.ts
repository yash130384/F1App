import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { run, query } from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { sessionId, trackId, sessionType } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 });
    }

    // Sicherheitscheck: User muss Owner der Liga sein, zu der die Session gehört
    const rows = await query<any>(
      `SELECT ts.id FROM telemetry_sessions ts
       JOIN leagues l ON ts.league_id = l.id
       WHERE ts.id = ? AND l.owner_id = ?`,
      [sessionId, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Keine Berechtigung oder Session nicht gefunden' }, { status: 403 });
    }

    await run(
      `UPDATE telemetry_sessions SET track_id = ?, session_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [trackId ?? null, sessionType ?? null, sessionId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[session-meta PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
