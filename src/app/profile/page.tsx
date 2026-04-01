"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Profile.module.css";
import DriverAvatar from "@/components/common/DriverAvatar";
import { 
    fixLeaguePermissions, 
    updateUserPassword, 
    updateUserEmail, 
    getOpenLeagues, 
    joinLeagueById 
} from "@/lib/actions";

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    
    // Profile Identity States
    const [isSaving, setIsSaving] = useState(false);
    const [steamName, setSteamName] = useState("");
    const [globalColor, setGlobalColor] = useState("#ffffff");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [driverLeagues, setDriverLeagues] = useState<any[]>([]);

    // Password & Email States
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [email, setEmail] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    // League Recruitment States
    const [openLeagues, setOpenLeagues] = useState<any[]>([]);
    const [selectedLeagueId, setSelectedLeagueId] = useState("");
    const [joinInProgess, setJoinInProgress] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/api/auth/signin");
        } else if (session?.user) {
            setSteamName((session.user as any).steamName || "");
            setGlobalColor((session.user as any).globalColor || "#ffffff");
            setAvatarUrl(session.user.image || "");
            setEmail(session.user.email || "");
            fetchDriverLeagues();
            fetchOpenLeagues();
            
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

    const fetchOpenLeagues = async () => {
        const res = await getOpenLeagues();
        if (res.success) {
            setOpenLeagues(res.leagues || []);
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

    const handleUpdatePassword = async () => {
        if (!oldPassword || !newPassword) {
            alert("Bitte fülle beide Passwort-Felder aus.");
            return;
        }
        setIsUpdatingPassword(true);
        const res = await updateUserPassword(oldPassword, newPassword);
        if (res.success) {
            alert("Passwort erfolgreich geändert!");
            setOldPassword("");
            setNewPassword("");
        } else {
            alert("Fehler: " + res.error);
        }
        setIsUpdatingPassword(false);
    };

    const handleUpdateEmail = async () => {
        if (!email) return;
        setIsUpdatingEmail(true);
        const res = await updateUserEmail(email);
        if (res.success) {
            await update({ email });
            alert("E-Mail erfolgreich aktualisiert!");
        } else {
            alert("Fehler: " + res.error);
        }
        setIsUpdatingEmail(false);
    };

    const handleJoinLeague = async () => {
        if (!selectedLeagueId) return;
        setJoinInProgress(true);
        
        const driverName = (session?.user?.name) || steamName || "New Driver";
        const res = await joinLeagueById(selectedLeagueId, driverName, "", globalColor);
        
        if (res.success) {
            alert("Erfolgreich beigetreten!");
            setSelectedLeagueId("");
            fetchDriverLeagues();
        } else {
            alert("Fehler beim Beitritt: " + res.error);
        }
        setJoinInProgress(false);
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
                    <Link href="/create-league" className={`${styles.btnAction} ${styles.btnSecondary}`} style={{ borderColor: 'var(--f1-red)', color: 'var(--f1-red)' }}>
                        ESTABLISH LEAGUE
                    </Link>
                    <Link href="/profile/analysis" className={`${styles.btnAction} ${styles.btnSecondary}`}>
                        MY TELEMETRY
                    </Link>
                    <button onClick={() => signOut()} className={styles.btnAction}>
                        LOGOUT
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Identity & Security */}
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
                        <div style={{width: '100%', marginTop: '1rem'}} className={styles.inputGroup}>
                            <label>Email Address</label>
                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                <input 
                                    type="email" 
                                    className={styles.input} 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                />
                                <button 
                                    className={styles.btnAction} 
                                    style={{padding: '0 1rem', minWidth: 'auto'}}
                                    onClick={handleUpdateEmail}
                                    disabled={isUpdatingEmail}
                                >
                                    {isUpdatingEmail ? "..." : "UPDATE"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem'}}>
                        <h3 style={{fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--f1-red)'}}>SECURITY</h3>
                        <div className={styles.inputGroup}>
                            <label>Current Password</label>
                            <input 
                                type="password" 
                                className={styles.input} 
                                value={oldPassword} 
                                onChange={e => setOldPassword(e.target.value)} 
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>New Password</label>
                            <input 
                                type="password" 
                                className={styles.input} 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                            />
                        </div>
                        <button 
                            className={styles.btnAction} 
                            style={{width: '100%', marginTop: '0.5rem'}}
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword}
                        >
                            {isUpdatingPassword ? "UPDATING..." : "CHANGE PASSWORD"}
                        </button>
                    </div>
                </div>

                {/* Globale Einstellungen */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Visuals & Ingame</h2>
                    
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
                        style={{marginTop: '1.5rem'}} 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                    >
                        {isSaving ? "SYNCING..." : "SAVE VISUALS"}
                    </button>

                    <div style={{marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem'}}>
                        <h3 style={{fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--f1-red)'}}>RECRUITMENT</h3>
                        <label style={{fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.5rem'}}>JOIN OPEN LEAGUE</label>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <select 
                                className={styles.input} 
                                style={{background: 'rgba(0,0,0,0.3)', cursor: 'pointer'}}
                                value={selectedLeagueId}
                                onChange={e => setSelectedLeagueId(e.target.value)}
                            >
                                <option value="">Select a League...</option>
                                {openLeagues.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                            <button 
                                className={`${styles.btnAction} ${styles.btnPrimary}`}
                                style={{minWidth: '100px'}}
                                onClick={handleJoinLeague}
                                disabled={!selectedLeagueId || joinInProgess}
                            >
                                {joinInProgess ? "..." : "JOIN"}
                            </button>
                        </div>
                        <p style={{fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.5}}>
                            Only showing leagues set to 'Public' or 'Open Selection'.
                        </p>
                    </div>
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
                                            disabled={dl.isLocked}
                                            style={{ opacity: dl.isLocked ? 0.6 : 1, cursor: dl.isLocked ? 'not-allowed' : 'pointer' }}
                                        >
                                            <option value="">No Team (Free Agent)</option>
                                            {dl.availableTeams?.map((t: any) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        {dl.isLocked && (
                                            <div style={{ fontSize: '0.65rem', color: 'var(--f1-red)', marginTop: '4px', textAlign: 'right', fontWeight: 900 }}>
                                                LOCKED BY ADMIN
                                            </div>
                                        )}
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
