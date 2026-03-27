'use client';

import { useState, useEffect, useRef } from 'react';
import { LiveState, LivePlayerState } from '@/types/live';

/**
 * Custom Hook zur Verwaltung der Live-Telemetriedaten via Server-Sent Events (SSE).
 * Übernimmt das Parsen der Daten, das Filtern der Frequenz und die Fahrer-Historie.
 * 
 * @returns State-Objekt mit Live-Daten, Verbindungsstatus und Telemetrie-Historie.
 */
export function useLiveStream(selectedDriver: string) {
    const [liveState, setLiveState] = useState<LiveState | null>(null);
    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(0);
    const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
    const [selectedDriverLaps, setSelectedDriverLaps] = useState<any[]>([]);
    const lastRenderRef = useRef<number>(0);

    useEffect(() => {
        // Reset der Historie bei Fahrerwechsel
        setTelemetryHistory([]);
        setSelectedDriverLaps([]);
    }, [selectedDriver]);

    useEffect(() => {
        const es = new EventSource('/api/live/stream');
        
        es.onopen = () => setConnected(true);
        es.onmessage = (e) => {
            const now = Date.now();
            // Erzwungene Begrenzung der Render-Frequenz auf max. 10 FPS zur Entlastung des Browsers
            if (now - lastRenderRef.current < 100) return; 
            lastRenderRef.current = now;

            try {
                const raw = JSON.parse(e.data);
                
                // Mapping und Normalisierung der eingehenden Daten
                const data: LiveState = {
                    sessionType: raw.sessionType,
                    trackId: raw.trackId,
                    trackLength: raw.trackLength,
                    totalLaps: raw.sessionData?.totalLaps || 50,
                    timestamp: now,
                    incidentLog: raw.incidentLog || [],
                    trackFlags: raw.trackFlags || 0,
                    leagueId: raw.leagueId,
                    leagueName: raw.leagueName,
                    players: (raw.players || []).map((p: any) => ({
                        ...p,
                        // Kompatibilitätsschicht für verschiedene API-Versionen (flach vs. geschachtelt)
                        lastLapTimeInMS: p.lastLapTimeInMS || p.lapInfo?.lastLapTimeInMS || 0,
                        currentLapTimeInMS: p.currentLapTimeInMS || p.lapInfo?.currentLapTimeInMS || 0,
                        currentLapNum: p.currentLapNum || p.lapInfo?.currentLapNum || 0,
                        pitStatus: p.pitStatus || p.lapInfo?.pitStatus || 0,
                        sector1Ms: p.sector1Ms || p.lapInfo?.sector1Ms || 0,
                        sector2Ms: p.sector2Ms || p.lapInfo?.sector2Ms || 0,
                        deltaToCarInFrontMs: p.deltaToCarInFrontMs || p.lapInfo?.deltaToCarInFrontMs || 0,
                        deltaToRaceLeaderMs: p.deltaToRaceLeaderMs || p.lapInfo?.deltaToRaceLeaderMs || 0,
                    }))
                };

                setLiveState(data);
                setLastUpdate(now);
                
                // Historisierung für den aktuell ausgewählten Fahrer
                if (selectedDriver) {
                    const p = data.players.find(pl => pl.gameName === selectedDriver);
                    if (p) {
                        setTelemetryHistory(h => [
                            ...h.slice(-199),
                            {
                                time: now,
                                throttle: p.throttle ?? 0,
                                brake: p.brake ?? 0,
                                steer: p.steer ?? 0,
                                gear: p.gear ?? 0,
                                ers: p.ersStoreEnergy ? p.ersStoreEnergy / 4000000 : 0,
                                drs: p.drs ?? 0,
                                tyreTemps: p.tyresSurfaceTemperature || [0,0,0,0],
                                brakeTemps: p.brakesTemperature || [0,0,0,0]
                            }
                        ]);

                        if (p.laps && Array.isArray(p.laps) && p.laps.length > 0) {
                            setSelectedDriverLaps(prev => {
                                const existingIds = new Set(prev.map(l => l.lapNumber));
                                const newLaps = p.laps!.filter(l => !existingIds.has(l.lapNumber));
                                return [...prev, ...newLaps].slice(-50);
                            });
                        }
                    }
                }
            } catch (err) { 
                console.error("SSE Parse Error:", err); 
            }
        };

        es.onerror = () => setConnected(false);
        
        return () => {
            es.close();
        };
    }, [selectedDriver]);

    return {
        liveState,
        connected,
        lastUpdate,
        telemetryHistory,
        selectedDriverLaps,
        isStale: Date.now() - lastUpdate > 5000
    };
}
