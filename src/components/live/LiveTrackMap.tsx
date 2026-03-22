'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { getTrackLayout, TrackLayout } from '@/lib/trackData';

interface Player {
    gameName: string;
    lapDistance: number;
    position: number;
    isHuman: boolean;
}

interface Props {
    trackId: number;
    trackLength: number;
    players: Player[];
    selectedDriver: string;
}

export function LiveTrackMap({ trackId, trackLength, players, selectedDriver }: Props) {
    const layout = useMemo(() => getTrackLayout(trackId), [trackId]);
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState(0);

    useEffect(() => {
        if (pathRef.current) {
            setPathLength(pathRef.current.getTotalLength());
        }
    }, [layout]);

    const driverPoints = useMemo(() => {
        if (!pathRef.current || pathLength === 0 || trackLength === 0) return [];

        return players.map(p => {
            const progress = Math.max(0, Math.min(1, p.lapDistance / trackLength));
            try {
                const pt = pathRef.current!.getPointAtLength(progress * pathLength);
                return {
                    ...p,
                    x: pt.x,
                    y: pt.y
                };
            } catch (e) {
                return { ...p, x: 0, y: 0 };
            }
        });
    }, [players, pathLength, trackLength]);

    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 300
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Track Map — {layout.name}
                </span>
                <div style={{ fontSize: 10, color: '#666' }}>
                    {trackLength}m
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg
                    viewBox={layout.viewBox}
                    style={{ width: '100%', height: '100%', maxHeight: 400 }}
                >
                    <path
                        ref={pathRef}
                        d={layout.path}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d={layout.path}
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {driverPoints.map(p => (
                        <g key={p.gameName} transform={`translate(${p.x}, ${p.y})`}>
                            <circle
                                r={p.gameName === selectedDriver ? 6 : 4}
                                fill={p.isHuman ? (p.gameName === selectedDriver ? '#fff' : '#22c55e') : 'rgba(255,255,255,0.6)'}
                                stroke={p.gameName === selectedDriver ? '#ef4444' : 'none'}
                                strokeWidth="2"
                                style={{ transition: 'all 0.3s ease-out' }}
                            />
                            { (p.gameName === selectedDriver || p.isHuman) && (
                                <text
                                    y="-10"
                                    textAnchor="middle"
                                    fill="#fff"
                                    style={{ fontSize: '8px', fontWeight: 800, textShadow: '0 0 4px #000' }}
                                >
                                    {p.gameName === selectedDriver ? `P${p.position}` : p.position}
                                </text>
                            ) }
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
