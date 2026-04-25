import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { telemetrySessions, leagues } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

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
    const rows = await db.select({ id: telemetrySessions.id })
      .from(telemetrySessions)
      .innerJoin(leagues, eq(telemetrySessions.leagueId, leagues.id))
      .where(and(eq(telemetrySessions.id, sessionId), eq(leagues.ownerId, userId)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Keine Berechtigung oder Session nicht gefunden' }, { status: 403 });
    }

    await db.update(telemetrySessions)
      .set({ 
          trackId: trackId ?? null, 
          sessionType: sessionType ?? null, 
          updatedAt: new Date() 
      })
      .where(eq(telemetrySessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[session-meta PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
