import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { 
    telemetrySessions, 
    telemetryParticipants, 
    drivers, 
    leagues, 
    races 
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getTrackNameById } from "@/lib/constants";
import Link from "next/link";
import styles from "../Profile.module.css";
import { redirect } from "next/navigation";

export default async function UserAnalysisPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/api/auth/signin");
    }

    const userId = (session.user as any).id;

    // Finde alle Sessions in denen dieser User mitgefahren ist
    // Wir joinen über drivers -> telemetry_participants -> telemetry_sessions
    const sessions = await db.select({
        sessionId: telemetrySessions.id,
        sessionType: telemetrySessions.sessionType,
        createdAt: telemetrySessions.createdAt,
        trackId: telemetrySessions.trackId,
        leagueName: leagues.name,
        participantId: telemetryParticipants.id,
        topSpeed: telemetryParticipants.topSpeed,
        raceTrack: races.track
    })
    .from(telemetrySessions)
    .innerJoin(telemetryParticipants, eq(telemetryParticipants.sessionId, telemetrySessions.id))
    .innerJoin(drivers, eq(telemetryParticipants.driverId, drivers.id))
    .innerJoin(leagues, eq(telemetrySessions.leagueId, leagues.id))
    .leftJoin(races, eq(telemetrySessions.raceId, races.id))
    .where(eq(drivers.userId, userId))
    .orderBy(desc(telemetrySessions.createdAt));

    return (
        <div className={styles.profileContainer}>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>TELEMETRIE ANALYSE</h1>
                <Link href="/profile" className={styles.btnAction} style={{background: 'transparent', border: '1px solid var(--f1-red)'}}>
                    BACK TO PROFILE
                </Link>
            </div>

            <p style={{color: 'rgba(255,255,255,0.7)', marginBottom: '2rem'}}>
                Hier findest du alle aufgezeichneten Telemetrie-Daten deiner Sessions (Rennen, Training, Qualifikation).
                Klicke auf eine Session, um in die detaillierte Kurven- und Pedaldaten-Analyse einzusteigen.
            </p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {sessions.length === 0 ? (
                    <div style={{padding: '2rem', background: 'rgba(0,0,0,0.5)', textAlign: 'center'}}>
                        Keine Telemetrie-Aufzeichnungen gefunden.
                    </div>
                ) : (
                    sessions.map((s, idx) => {
                        const trackName = s.raceTrack || getTrackNameById(Number(s.trackId)) || `Track ID ${s.trackId}`;
                        const dateText = s.createdAt ? new Date(s.createdAt).toLocaleString('de-DE') : 'Unbekannt';
                        const url = `/profile/analysis/${s.sessionId}?pid=${s.participantId}`;

                        return (
                            <Link href={url} key={`${s.sessionId}-${idx}`} style={{ textDecoration: 'none' }}>
                                <div className={styles.card} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <div style={{fontSize: '1.2rem', fontWeight: 800}}>{trackName}</div>
                                        <div style={{color: 'var(--f1-red)', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 700}}>
                                            {s.leagueName} <span style={{color: '#fff', margin: '0 0.5rem'}}>•</span> {s.sessionType}
                                        </div>
                                        <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                                            {dateText}
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)'}}>Top Speed</div>
                                        <div style={{fontSize: '1.1rem', fontWeight: 700}}>{Math.round(s.topSpeed || 0)} km/h</div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
