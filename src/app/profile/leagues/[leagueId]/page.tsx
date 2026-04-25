'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { getLeagueById, getAdminLeagueDrivers } from '@/lib/actions';
import styles from './LeagueDashboard.module.css';

// Sub-Komponenten
import LeagueHeader from './_components/LeagueHeader';
import RosterManagement from './_components/RosterManagement';
import RecentSessions from './_components/RecentSessions';
import QuickActions from './_components/QuickActions';
import TelemetryHub from './_components/TelemetryHub';
import { LoadingState, ErrorState } from './_components/StatusScreens';
import { useExperimental } from '@/hooks/useExperimental';

/**
 * Das Haupt-Dashboard für eine spezifische F1-Liga.
 * Diese Seite koordiniert den Datenabruf und delegiert die Darstellung an spezialisierte Sub-Komponenten.
 */
export default function LeagueDashboard({ params }: { params: Promise<{ leagueId: string }> }) {
    const { leagueId } = React.use(params);
    const [league, setLeague] = useState<any>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const experimental = useExperimental();

    useEffect(() => {
        async function loadData() {
            console.log("Starting loadData for leagueId:", leagueId);
            setLoading(true);
            try {
                const [leagueRes, driversRes] = await Promise.all([
                    getLeagueById(leagueId),
                    getAdminLeagueDrivers(leagueId)
                ]);

                console.log("leagueRes:", leagueRes.success ? "success" : "failed", leagueRes.error);
                console.log("driversRes:", driversRes.success ? "success" : "failed", driversRes.error);

                if (leagueRes.success) {
                    setLeague(leagueRes.league);
                } else {
                    setError(leagueRes.error || "Failed to load league details");
                }

                if (driversRes.success) {
                    setDrivers(driversRes.drivers || []);
                } else if (!leagueRes.success) {
                    // Only show driver error if league load also failed or if we want to be strict
                    console.error("Drivers load error:", driversRes.error);
                }
            } catch (err: any) {
                console.error("LeagueDashboard loadData error:", err);
                setError(err.message || "An unexpected error occurred while syncing league data.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [leagueId]);

    // Ladezustand anzeigen
    if (loading) return <LoadingState />;

    // Fehlerzustand anzeigen (z.B. Liga nicht gefunden oder kein Zugriff)
    if (error) return <ErrorState error={error} />;

    return (
        <div className={`container animate-fade-in ${styles.dashboardContainer}`}>
            {/* Header mit Liganame und Primär-Aktionen */}
            <LeagueHeader 
                name={league?.name} 
                leagueId={leagueId} 
                isJoinLocked={!!league?.joinLocked}
                isTeamsLocked={!!league?.teamsLocked}
            />

            <div className={styles.mainGrid}>
                {/* Hauptbereich: Roster und Historie */}
                <div className="flex flex-col gap-6">
                    <RosterManagement drivers={drivers} />
                    <RecentSessions />
                </div>

                {/* Sidebar: Einstellungen und Telemetrie-Status */}
                <div className="flex flex-col gap-6">
                    <QuickActions leagueId={leagueId} />
                    {experimental && <TelemetryHub />}
                </div>
            </div>
        </div>
    );
}

