'use client';

import React, { useState, useMemo } from 'react';
import styles from './page.module.css';

// Hooks & Typen
import { useLiveStream } from '@/hooks/useLiveStream';
import { LivePlayerState } from '@/types/live';

// Komponenten
import { InputTrace } from '@/components/live/InputTrace';
import { GForceCrosshair } from '@/components/live/GForceCrosshair';
import { TyreWidget } from '@/components/live/TyreWidget';
import { BrakeWidget } from '@/components/live/BrakeWidget';
import { PitAdvisor } from '@/components/live/PitAdvisor';
import { FuelTracker } from '@/components/live/FuelTracker';
import { GapMatrix } from '@/components/live/GapMatrix';
import { IncidentLog } from '@/components/live/IncidentLog';
import { LiveTelemetryGraph } from '@/components/live/LiveTelemetryGraph';
import { LiveTrackMap } from '@/components/live/LiveTrackMap';
import { LiveTyreGraph } from '@/components/live/LiveTyreGraph';
import { LiveBrakeGraph } from '@/components/live/LiveBrakeGraph';
import { SelectedDriverHistory } from '@/components/live/SelectedDriverHistory';

const EMPTY_ARR = [0, 0, 0, 0];

/** Standard-Zustand für einen leeren Fahrer-Slot */
const DUMMY: LivePlayerState = {
    gameName: '---', position: 0, lapDistance: 0, isHuman: false, teamId: 0, pitStops: 0,
    warnings: 0, penaltiesTime: 0, ersStoreEnergy: 0,
    speedKmh: 0, throttle: 0, brake: 0, steer: 0, clutch: 0,
    gear: 0, engineRPM: 0, drs: 0,
    brakesTemperature: EMPTY_ARR, tyresSurfaceTemperature: EMPTY_ARR,
    tyresInnerTemperature: EMPTY_ARR, tyresPressure: EMPTY_ARR,
    gForceLateral: 0, gForceLongitudinal: 0, gForceVertical: 0,
    ersDeployMode: 0, fuelMix: 0, fuelRemainingLaps: 0, fuelInTank: 0,
    actualTyreCompound: 18, visualTyreCompound: 18, tyresAgeLaps: 0,
    tyreBlisters: EMPTY_ARR, tyresWear: EMPTY_ARR, tyresDamage: EMPTY_ARR,
    brakesDamage: EMPTY_ARR, frontLeftWingDamage: 0, frontRightWingDamage: 0,
    rearWingDamage: 0, gearBoxDamage: 0, engineDamage: 0,
    currentLapTimeInMS: 0, lastLapTimeInMS: 0, currentLapNum: 0,
    sector1Ms: 0, sector2Ms: 0,
    pitStatus: 0, driverStatus: 0, resultStatus: 0,
    pitLaneTimeInLaneInMS: 0, pitStopTimerInMS: 0,
    deltaToCarInFrontMs: 0, deltaToRaceLeaderMs: 0,
    pitStopWindowIdealLap: 0, pitStopWindowLatestLap: 0, pitStopRejoinPosition: 0,
};

/**
 * Die LivePage ist das zentrale Dashboard für Echtzeit-Telemetrie.
 * Sie nutzt Server-Sent Events (SSE) für eine performante Datenübertragung
 * und bietet Werkzeuge zur Analyse während des Rennens.
 */
export default function LivePage() {
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const { liveState, connected, telemetryHistory, selectedDriverLaps, isStale } = useLiveStream(selectedDriver);

    // Aktuell ausgewählten Fahrer extrahieren
    const driver: LivePlayerState = useMemo(() => {
        if (!liveState) return DUMMY;
        // Falls kein Fahrer ausgewählt, automatisch den ersten menschlichen Fahrer wählen
        if (!selectedDriver) {
            const human = liveState.players.find(p => p.isHuman);
            if (human) return human;
            return liveState.players[0] ?? DUMMY;
        }
        return liveState.players.find(p => p.gameName === selectedDriver) ?? DUMMY;
    }, [liveState, selectedDriver]);

    // Automatisches Setzen des initialen Fahrers
    React.useEffect(() => {
        if (!selectedDriver && liveState && liveState.players.length > 0) {
            const human = liveState.players.find(p => p.isHuman);
            setSelectedDriver(human?.gameName ?? liveState.players[0].gameName);
        }
    }, [liveState, selectedDriver]);

    return (
        <div className={styles.container}>
            {/* Kopfzeile mit Session-Infos und Fahrer-Auswahl */}
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>🏎 Live Dashboard</h1>
                    <div className={styles.subtitle}>
                        {liveState?.sessionType ?? 'Warte auf Sitzung...'} • Track {liveState?.trackId ?? '--'}
                        {liveState?.leagueName && (
                            <span className={`${styles.leagueBadge} ${liveState.leagueId?.length === 36 ? styles.leagueActive : styles.leaguePending}`}>
                                🏆 {liveState.leagueName}
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.actionSection}>
                    {liveState && liveState.players.length > 0 && (
                        <select
                            value={selectedDriver}
                            onChange={e => setSelectedDriver(e.target.value)}
                            className={styles.driverSelect}
                        >
                            {liveState.players
                                .slice()
                                .sort((a, b) => a.position - b.position)
                                .map(p => (
                                    <option key={p.gameName} value={p.gameName}>
                                        P{p.position} — {p.gameName} {p.isHuman ? '👤' : '🤖'}
                                    </option>
                                ))
                            }
                        </select>
                    )}
                    <div className={styles.statusIndicator}>
                        <span className={`${styles.statusDot} ${connected && !isStale ? styles.dotActive : styles.dotInactive}`} />
                        <span>{connected && !isStale ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </header>

            {/* Warte-Zustand falls noch keine Daten da sind */}
            {!liveState && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingIcon}>📡</div>
                    <p>Warte auf Telemetrie-Daten...</p>
                </div>
            )}

            {/* Haupt-Layout des Dashboards */}
            {liveState && (
                <div className={styles.mainGrid}>
                    {/* Linke Spalte: Fahrer-spezifische Telemetrie */}
                    <div className={styles.leftColumn}>
                        <div className={styles.driverHero}>
                            <div className={styles.driverName}>
                                P{driver.position} — {driver.gameName}
                            </div>
                            <div className={styles.driverStats}>
                                <span>Runde <b className={styles.statValue}>{driver.currentLapNum}</b></span>
                                <span>Abstand Vorne <b className={styles.statValue}>+{(driver.deltaToCarInFrontMs / 1000).toFixed(3)}s</b></span>
                                <span>Abstand Führender <b className={styles.statValue}>+{(driver.deltaToRaceLeaderMs / 1000).toFixed(3)}s</b></span>
                            </div>
                        </div>

                        <div className={styles.inputGrid}>
                            <InputTrace
                                throttle={driver.throttle} brake={driver.brake} clutch={driver.clutch}
                                gear={driver.gear} engineRPM={driver.engineRPM} drs={driver.drs}
                                ersDeployMode={driver.ersDeployMode} speedKmh={driver.speedKmh}
                            />
                            <GForceCrosshair
                                lateral={driver.gForceLateral} longitudinal={driver.gForceLongitudinal} vertical={driver.gForceVertical}
                            />
                        </div>

                        <LiveTelemetryGraph history={telemetryHistory} />

                        <div className={styles.bottomGrid}>
                            <div className={styles.leftColumn}>
                                <SelectedDriverHistory laps={selectedDriverLaps} />
                                <LiveTyreGraph history={telemetryHistory} />
                            </div>
                            <div className={styles.leftColumn}>
                                <LiveBrakeGraph history={telemetryHistory} />
                                <FuelTracker 
                                    fuelMix={driver.fuelMix} fuelRemainingLaps={driver.fuelRemainingLaps}
                                    currentLapNum={driver.currentLapNum} totalLaps={liveState.totalLaps || 50}
                                />
                            </div>
                        </div>
                        
                        <PitAdvisor 
                            idealLap={driver.pitStopWindowIdealLap} latestLap={driver.pitStopWindowLatestLap}
                            rejoinPos={driver.pitStopRejoinPosition} currentLap={driver.currentLapNum}
                            tyreSets={driver.tyreSets}
                        />
                    </div>

                    {/* Rechte Spalte: Globale Session-Daten */}
                    <div className={styles.rightColumn}>
                        <LiveTrackMap 
                            trackId={liveState.trackId} 
                            trackLength={liveState.trackLength} 
                            players={liveState.players}
                            selectedDriver={selectedDriver}
                        />
                        <IncidentLog 
                            incidents={liveState.incidentLog || []} 
                            trackFlags={liveState.trackFlags || 0} 
                        />
                        <GapMatrix 
                            players={liveState.players} 
                            selectedDriver={selectedDriver}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
