'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { getTrackLayout } from '@/lib/trackData';
import styles from './LiveTrackMap.module.css';

/** Datenstruktur eines Fahrers für die Karten-Visualisierung */
interface Player {
    /** Name im Spiel */
    gameName: string;
    /** Aktuelle Distanz in der Runde (Meter) */
    lapDistance: number;
    /** Aktuelle Position im Rennen */
    position: number;
    /** Ob es sich um einen menschlichen Spieler handelt */
    isHuman: boolean;
}

/** Props für die LiveTrackMap Komponente */
interface Props {
    /** ID der Rennstrecke (entspricht F1 2024/25 Mapping) */
    trackId: number;
    /** Gesamtlänge der Strecke in Metern */
    trackLength: number;
    /** Liste aller aktiven Fahrer */
    players: Player[];
    /** Name des aktuell zur Analyse ausgewählten Fahrers */
    selectedDriver: string;
}

/**
 * Die LiveTrackMap visualisiert die Position aller Fahrer auf der Rennstrecke.
 * Sie nutzt SVG-Pfad-Animationen und berechnet die Positionen basierend auf der Lap-Distance.
 * Die Karte ist responsiv und hebt menschliche sowie ausgewählte Fahrer besonders hervor.
 */
export function LiveTrackMap({ trackId, trackLength, players, selectedDriver }: Props) {
    // Layout-Daten (SVG-Pfad und ViewBox) für die Strecke laden
    const layout = useMemo(() => getTrackLayout(trackId), [trackId]);
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState(0);

    // Gesamtlänge des SVG-Pfades bestimmen, sobald das Layout geladen ist
    useEffect(() => {
        if (pathRef.current && typeof pathRef.current.getTotalLength === 'function') {
            setPathLength(pathRef.current.getTotalLength());
        }
    }, [layout]);

    // Berechnen der X/Y-Koordinaten für jeden Fahrer basierend auf dessen Fortschritt (0-1)
    const driverPoints = useMemo(() => {
        if (!pathRef.current || pathLength === 0 || trackLength === 0) return [];

        return players.map(p => {
            const progress = Math.max(0, Math.min(1, p.lapDistance / trackLength));
            try {
                // Punkt auf dem SVG-Pfad für den aktuellen Fortschritt finden
                if (pathRef.current && typeof pathRef.current.getPointAtLength === 'function') {
                    const pt = pathRef.current.getPointAtLength(progress * pathLength);
                    return { ...p, x: pt.x, y: pt.y };
                }
                return { ...p, x: progress * 100, y: 0 }; // Einfacher Fallback für Tests
            } catch (e) {
                // Fallback bei Fehlern in der SVG-Berechnung
                return { ...p, x: 0, y: 0 };
            }
        });
    }, [players, pathLength, trackLength]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <span className={styles.trackName}>
                    Streckenkarte — {layout.name}
                </span>
                <div className={styles.trackInfo}>
                    {trackLength}m
                </div>
            </header>

            <div className={styles.mapWrapper}>
                <svg
                    viewBox={layout.viewBox}
                    className={styles.svg}
                >
                    {/* Basis-Pfad (die "Graue" Strecke) */}
                    <path
                        ref={pathRef}
                        d={layout.path}
                        className={styles.trackPathBase}
                    />
                    {/* Dünne aktive Linie für besseren Kontrast */}
                    <path
                        d={layout.path}
                        className={styles.trackPathActive}
                    />

                    {/* Visualisierung der Fahrer-Punkte */}
                    {driverPoints.map(p => {
                        const isSelected = p.gameName === selectedDriver;
                        const isHuman = p.isHuman;

                        return (
                            <g 
                                key={p.gameName} 
                                transform={`translate(${p.x}, ${p.y})`}
                                className={styles.driverDot}
                            >
                                <circle
                                    r={isSelected ? 6 : 4}
                                    fill={isHuman ? (isSelected ? '#fff' : '#22c55e') : 'rgba(255,255,255,0.4)'}
                                    className={isSelected ? styles.selectedCircle : ''}
                                />
                                { (isSelected || isHuman) && (
                                    <text
                                        y="-12"
                                        textAnchor="middle"
                                        className={`${styles.driverLabel} ${isHuman ? styles.humanLabel : ''}`}
                                    >
                                        {isSelected ? `P${p.position}` : p.position}
                                    </text>
                                ) }
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
