import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
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
    const sessions = await query<any>(`
        SELECT 
            s.id as session_id,
            s.session_type,
            s.created_at,
            s.track_id,
            l.name as league_name,
            p.id as participant_id,
            p.top_speed,
            r.track as race_track
        FROM telemetry_sessions s
        JOIN telemetry_participants p ON p.session_id = s.id
        JOIN drivers d ON p.driver_id = d.id
        JOIN leagues l ON s.league_id = l.id
        LEFT JOIN races r ON s.race_id = r.id
        WHERE d.user_id = ?
        ORDER BY s.created_at DESC
    `, [userId]);

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
                        const trackName = s.race_track || getTrackNameById(s.track_id) || `Track ID ${s.track_id}`;
                        const dateText = new Date(s.created_at).toLocaleString('de-DE');
                        const url = `/profile/analysis/${s.session_id}?pid=${s.participant_id}`;

                        return (
                            <Link href={url} key={`${s.session_id}-${idx}`} style={{ textDecoration: 'none' }}>
                                <div className={styles.card} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div>
                                        <div style={{fontSize: '1.2rem', fontWeight: 800}}>{trackName}</div>
                                        <div style={{color: 'var(--f1-red)', fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 700}}>
                                            {s.league_name} <span style={{color: '#fff', margin: '0 0.5rem'}}>•</span> {s.session_type}
                                        </div>
                                        <div style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '0.25rem'}}>
                                            {dateText}
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)'}}>Top Speed</div>
                                        <div style={{fontSize: '1.1rem', fontWeight: 700}}>{Math.round(s.top_speed || 0)} km/h</div>
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
