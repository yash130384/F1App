'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { InputTrace } from '@/components/live/InputTrace';
import { GForceCrosshair } from '@/components/live/GForceCrosshair';
import { TyreWidget } from '@/components/live/TyreWidget';
import { BrakeWidget } from '@/components/live/BrakeWidget';
import { PitAdvisor } from '@/components/live/PitAdvisor';
import { FuelTracker } from '@/components/live/FuelTracker';
import { GapMatrix } from '@/components/live/GapMatrix';
import { IncidentLog } from '@/components/live/IncidentLog';

interface Incident {
    timestamp: number;
    type: 'PENALTY' | 'COLLISION' | 'OVERTAKE' | 'RETIREMENT' | 'SAFETY_CAR';
    details: string;
    vehicleIdx?: number;
    otherVehicleIdx?: number;
    lapNum?: number;
}

interface LivePlayerState {
    gameName: string;
    position: number;
    isHuman: boolean;
    teamId: number;
    pitStops: number;
    warnings: number;
    penaltiesTime: number;
    speedKmh: number;
    throttle: number;
    brake: number;
    steer: number;
    clutch: number;
    gear: number;
    engineRPM: number;
    drs: number;
    brakesTemperature: number[];
    tyresSurfaceTemperature: number[];
    tyresInnerTemperature: number[];
    tyresPressure: number[];
    gForceLateral: number;
    gForceLongitudinal: number;
    gForceVertical: number;
    ersDeployMode: number;
    fuelMix: number;
    fuelRemainingLaps: number;
    fuelInTank: number;
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    tyreBlisters: number[];
    tyresWear: number[];
    tyresDamage: number[];
    brakesDamage: number[];
    frontLeftWingDamage: number;
    frontRightWingDamage: number;
    rearWingDamage: number;
    gearBoxDamage: number;
    engineDamage: number;
    currentLapTimeInMS: number;
    lastLapTimeInMS: number;
    currentLapNum: number;
    pitStatus: number;
    deltaToCarInFrontMs: number;
    deltaToRaceLeaderMs: number;
    pitStopWindowIdealLap: number;
    pitStopWindowLatestLap: number;
    pitStopRejoinPosition: number;
    tyreSets?: any[];
}

interface LiveState {
    leagueId?: string;
    leagueName?: string;
    sessionType: string;
    trackId: number;
    trackLength: number;
    totalLaps?: number;
    timestamp: number;
    players: LivePlayerState[];
    incidentLog?: Incident[];
    trackFlags?: number;
}

function formatMs(ms: number): string {
    if (!ms || ms === 0) return '--:--.---';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const mss = ms % 1000;
    return `${mins}:${String(secs).padStart(2, '0')}.${String(mss).padStart(3, '0')}`;
}

const EMPTY_ARR = [0, 0, 0, 0];

const DUMMY: LivePlayerState = {
    gameName: '---', position: 0, isHuman: false, teamId: 0, pitStops: 0,
    warnings: 0, penaltiesTime: 0,
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
    pitStatus: 0, deltaToCarInFrontMs: 0, deltaToRaceLeaderMs: 0,
    pitStopWindowIdealLap: 0, pitStopWindowLatestLap: 0, pitStopRejoinPosition: 0,
};

export default function LivePage() {
    const [liveState, setLiveState] = useState<LiveState | null>(null);
    const [connected, setConnected] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [lastUpdate, setLastUpdate] = useState<number>(0);

    useEffect(() => {
        const es = new EventSource('/api/live/stream');
        es.onopen = () => setConnected(true);
        es.onmessage = (e) => {
            try {
                const raw = JSON.parse(e.data);
                
                const data: LiveState = {
                    sessionType: raw.sessionType,
                    trackId: raw.trackId,
                    trackLength: raw.trackLength,
                    totalLaps: raw.sessionData?.totalLaps || 50,
                    timestamp: Date.now(),
                    incidentLog: raw.incidentLog || [],
                    trackFlags: raw.trackFlags || 0,
                    leagueId: raw.leagueId,
                    leagueName: raw.leagueName,
                    players: raw.participants.map((p: any) => ({
                        gameName: p.gameName,
                        position: p.position,
                        isHuman: p.isHuman,
                        teamId: p.teamId,
                        pitStops: p.pitStops,
                        warnings: p.warnings,
                        penaltiesTime: p.penaltiesTime,
                        lastLapTimeInMS: p.lapInfo?.lastLapTimeInMS || 0,
                        currentLapTimeInMS: p.lapInfo?.currentLapTimeInMS || 0,
                        currentLapNum: p.lapInfo?.currentLapNum || 0,
                        pitStatus: p.lapInfo?.pitStatus || 0,
                        deltaToCarInFrontMs: p.lapInfo?.deltaToCarInFrontMs || 0,
                        deltaToRaceLeaderMs: p.lapInfo?.deltaToRaceLeaderMs || 0,
                        ...p.telemetry,
                        ...p.status,
                        ...p.damage,
                        ...p.motion,
                        ...p.sessionStatus,
                        tyreSets: p.tyreSets
                    }))
                };

                setLiveState(data);
                setLastUpdate(Date.now());
                
                setSelectedDriver(prev => {
                    if (!prev) {
                        const human = data.players.find(p => p.isHuman);
                        return human?.gameName ?? data.players[0]?.gameName ?? '';
                    }
                    return prev;
                });
            } catch (err) { console.error("Parse error", err); }
        };
        es.onerror = () => setConnected(false);
        return () => es.close();
    }, []);

    const driver: LivePlayerState = useMemo(() => {
        if (!liveState) return DUMMY;
        return liveState.players.find(p => p.gameName === selectedDriver) ?? DUMMY;
    }, [liveState, selectedDriver]);

    const isStale = Date.now() - lastUpdate > 5000;

    return (
        <div style={{ minHeight: '100vh', padding: '1.5rem', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                        🏎 Live Dashboard
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                            {liveState?.sessionType ?? 'Waiting for session...'} • Track {liveState?.trackId ?? '--'}
                        </p>
                        {liveState?.leagueName && (
                            <span style={{
                                fontSize: 10,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: liveState.leagueId && liveState.leagueId.length === 36 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: liveState.leagueId && liveState.leagueId.length === 36 ? '#22c55e' : '#ef4444',
                                border: `1px solid ${liveState.leagueId && liveState.leagueId.length === 36 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                fontWeight: 600,
                            }}>
                                🏆 {liveState.leagueName} {(!(liveState.leagueId && liveState.leagueId.length === 36)) && '(Unassigned)'}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {liveState && liveState.players.length > 0 && (
                        <select
                            value={selectedDriver}
                            onChange={e => setSelectedDriver(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            {liveState.players
                                .slice()
                                .sort((a, b) => a.position - b.position)
                                .map(p => (
                                    <option key={p.gameName} value={p.gameName} style={{ background: '#1a1a2e' }}>
                                        P{p.position} — {p.gameName} {p.isHuman ? '👤' : '🤖'}
                                    </option>
                                ))
                            }
                        </select>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: connected && !isStale ? '#22c55e' : '#ef4444',
                            boxShadow: connected && !isStale ? '0 0 6px #22c55e' : 'none',
                            display: 'inline-block',
                        }} />
                        <span style={{ color: '#666' }}>{connected && !isStale ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </div>

            {!liveState && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '50vh', gap: 16, color: '#444',
                }}>
                    <div style={{ fontSize: 64 }}>📡</div>
                    <p style={{ fontSize: 14 }}>Waiting for telemetry data...</p>
                </div>
            )}

            {liveState && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 10,
                            padding: '0.8rem 1.2rem',
                            display: 'flex', gap: 24, alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                                P{driver.position} — {driver.gameName}
                            </span>
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
                                <span>Lap <b style={{ color: '#fff' }}>{driver.currentLapNum}</b></span>
                                <span>Gap Front <b style={{ color: '#fff' }}>+{(driver.deltaToCarInFrontMs / 1000).toFixed(3)}s</b></span>
                                <span>Gap Lead <b style={{ color: '#fff' }}>+{(driver.deltaToRaceLeaderMs / 1000).toFixed(3)}s</b></span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                            <InputTrace
                                throttle={driver.throttle} brake={driver.brake} steer={driver.steer} clutch={driver.clutch}
                                gear={driver.gear} engineRPM={driver.engineRPM} drs={driver.drs}
                                ersDeployMode={driver.ersDeployMode} speedKmh={driver.speedKmh}
                            />
                            <GForceCrosshair
                                lateral={driver.gForceLateral} longitudinal={driver.gForceLongitudinal} vertical={driver.gForceVertical}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                            <TyreWidget
                                surfaceTemp={driver.tyresSurfaceTemperature} innerTemp={driver.tyresInnerTemperature}
                                pressure={driver.tyresPressure} tyreWear={driver.tyresWear}
                                tyreDamage={driver.tyresDamage} tyreBlisters={driver.tyreBlisters}
                                visualCompound={driver.visualTyreCompound} tyresAgeLaps={driver.tyresAgeLaps}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <BrakeWidget
                                    brakesTemperature={driver.brakesTemperature} brakesDamage={driver.brakesDamage}
                                />
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
