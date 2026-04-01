"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Profile.module.css";
import DriverAvatar from "@/components/common/DriverAvatar";
const { fixLeaguePermissions } = require("@/lib/actions") as any;

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    
    const [isSaving, setIsSaving] = useState(false);
    const [steamName, setSteamName] = useState("");
    const [globalColor, setGlobalColor] = useState("#ffffff");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [driverLeagues, setDriverLeagues] = useState<any[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/api/auth/signin");
        } else if (session?.user) {
            setSteamName((session.user as any).steamName || "");
            setGlobalColor((session.user as any).globalColor || "#ffffff");
            setAvatarUrl(session.user.image || "");
            fetchDriverLeagues();
            
            // Auto-Fix Permissions for TRunKX/Kleosa
            if (typeof fixLeaguePermissions === 'function') {
                fixLeaguePermissions().then((res: any) => {
                    if (res.success) {
                        console.log("League permissions synced:", res.message);
                        fetchDriverLeagues(); // Refresh to show admin section
                    }
                });
            }
        }
    }, [status, session, router]);

    const fetchDriverLeagues = async () => {
        try {
            const res = await fetch("/api/profile/leagues");
            if (res.ok) {
                const data = await res.json();
                setDriverLeagues(data.leagues || []);
            }
        } catch (e) {
            console.error("Failed to load driver leagues");
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ steamName, globalColor, avatarUrl })
            });
            if (res.ok) {
                // Update next-auth session locally
                await update({ steamName, globalColor, image: avatarUrl });
                alert("Profile saved successfully");
            } else {
                alert("Error saving profile");
            }
        } catch (e) {
            console.error(e);
        }
        setIsSaving(false);
    };

    const handleTeamChange = async (driverId: string, teamId: string | null) => {
        try {
            const reqUrl = `/api/profile/leagues?driverId=${driverId}&teamId=${teamId || ''}`;
            const res = await fetch(reqUrl, { method: "PUT" });
            if (res.ok) {
                fetchDriverLeagues(); // reload
            } else {
                alert("Failed to update team");
            }
        } catch (e) {
             console.error(e);
        }
    };

    if (status === "loading") {
        return <div className="container" style={{padding: '4rem', textAlign: 'center'}}>Loading F1 Core...</div>;
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className={styles.profileContainer}>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>DRIVER NETWORK</h1>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <Link href="/profile/analysis" className={`${styles.btnAction} ${styles.btnSecondary}`}>
                        MY TELEMETRY
                    </Link>
                    <button onClick={() => signOut()} className={styles.btnAction}>
                        LOGOUT
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Avatar & Identität */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Identity</h2>
                    
                    <div className={styles.avatarSection}>
                        <DriverAvatar 
                            src={avatarUrl} 
                            name={session.user.name || "Driver"} 
                            size={120} 
                            borderColor={globalColor}
                        />
                        <span style={{fontWeight: 800, fontSize: '1.2rem', marginTop: '1rem'}}>{session.user.name}</span>
                        <span style={{color: 'rgba(255,255,255,0.5)'}}>{session.user.email}</span>
                    </div>
                </div>

                {/* Globale Einstellungen */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Global Settings</h2>
                    
                    <div className={styles.inputGroup}>
                        <label>Avatar URL</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            value={avatarUrl} 
                            onChange={e => setAvatarUrl(e.target.value)} 
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                    
                    <div className={styles.inputGroup}>
                        <label>Steam Name / Ingame Name</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            value={steamName} 
                            onChange={e => setSteamName(e.target.value)} 
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Driver Accent Color (Global)</label>
                        <input 
                            type="color" 
                            style={{width: '100%', height: '40px', padding: 0, background: 'transparent', border: 'none'}}
                            value={globalColor} 
                            onChange={e => setGlobalColor(e.target.value)} 
                        />
                    </div>

                    <button 
                        className={styles.btnAction} 
                        style={{marginTop: '1rem'}} 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                    >
                        {isSaving ? "SYNCING..." : "SAVE PROFILE"}
                    </button>
                </div>
                
                {/* Ligen & Teams */}
                <div className={`${styles.card}`} style={{gridColumn: '1 / -1'}}>
                    <h2 className={styles.cardTitle}>Affiliated Leagues & Teams</h2>
                    {driverLeagues.length === 0 ? (
                        <p style={{color: 'rgba(255,255,255,0.5)'}}>You are not registered in any leagues yet.</p>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {driverLeagues.map((dl, idx) => (
                                <div key={idx} className={styles.leagueCard} style={{borderLeftColor: globalColor}}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className={styles.leagueName}>{dl.leagueName}</div>
                                            {dl.isAdmin && (
                                                <Link 
                                                    href={`/profile/leagues/${dl.leagueId}`} 
                                                    className={styles.adminBadge}
                                                    title="Admin Dashboard"
                                                >
                                                    ADMIN
                                                </Link>
                                            )}
                                        </div>
                                        <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)'}}>
                                            Driver Record ID: {dl.driverId.substring(0,8)}...
                                        </div>
                                    </div>
                                    <div>
                                        <select 
                                            className={styles.teamSelect}
                                            value={dl.teamId || ''}
                                            onChange={(e) => handleTeamChange(dl.driverId, e.target.value)}
                                        >
                                            <option value="">No Team (Free Agent)</option>
                                            {dl.availableTeams?.map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
