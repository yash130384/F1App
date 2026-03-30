'use client';

import { useEffect, useState } from 'react';

interface Participant {
    game_name: string;
    position: number;
    lap_distance: number;
    color?: string;
}

interface LiveTrackMapProps {
    trackLength: number;
    participants: Participant[];
}

export default function LiveTrackMap({ trackLength, participants }: LiveTrackMapProps) {
    // Generate a simple circular or rounded-rectangle track SVG path
    // Since we don't have actual SVG paths for all F1 2025 tracks, 
    // we use a generic racing oval shape for the live percentage.

    const svgWidth = 400;
    const svgHeight = 200;
    const padding = 20;

    // Track path variables
    const outerWidth = svgWidth - padding * 2;
    const outerHeight = svgHeight - padding * 2;
    const rx = outerHeight / 2;
    const ry = outerHeight / 2;

    const trackPath = `M ${padding + rx} ${padding} 
                       L ${svgWidth - padding - rx} ${padding} 
                       A ${rx} ${ry} 0 0 1 ${svgWidth - padding} ${padding + ry} 
                       A ${rx} ${ry} 0 0 1 ${svgWidth - padding - rx} ${svgHeight - padding} 
                       L ${padding + rx} ${svgHeight - padding} 
                       A ${rx} ${ry} 0 0 1 ${padding} ${padding + ry} 
                       A ${rx} ${ry} 0 0 1 ${padding + rx} ${padding} Z`;

    // Approximate path length for manual calculation if needed, 
    // but we can use SVG getPointAtLength via a ref, or simple math for our oval.
    const straightLength = outerWidth - (rx * 2);
    const curveLength = Math.PI * rx;
    const totalPathLength = (straightLength * 2) + (curveLength * 2);

    const getCoordinateForPercentage = (percentage: number) => {
        let remainingDistance = (percentage / 100) * totalPathLength;

        // 1. Top Straight (Left to Right)
        if (remainingDistance <= straightLength) {
            return {
                x: padding + rx + remainingDistance,
                y: padding
            };
        }
        remainingDistance -= straightLength;

        // 2. Right Curve (Top Right to Bottom Right)
        if (remainingDistance <= curveLength) {
            const angle = (Math.PI / 2) - ((remainingDistance / curveLength) * Math.PI);
            return {
                x: (svgWidth - padding - rx) + rx * Math.cos(angle),
                y: (padding + ry) - ry * Math.sin(angle)
            };
        }
        remainingDistance -= curveLength;

        // 3. Bottom Straight (Right to Left)
        if (remainingDistance <= straightLength) {
            return {
                x: (svgWidth - padding - rx) - remainingDistance,
                y: svgHeight - padding
            };
        }
        remainingDistance -= straightLength;

        // 4. Left Curve (Bottom Left to Top Left)
        const angle = (3 * Math.PI / 2) - ((remainingDistance / curveLength) * Math.PI);
        return {
            x: (padding + rx) + rx * Math.cos(angle),
            y: (padding + ry) - ry * Math.sin(angle)
        };
    };

    return (
        <div className="f1-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--f1-carbon-dark)' }}>
            <h3 className="text-f1" style={{ fontSize: '1.2rem', color: 'var(--f1-red)', width: '100%', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                LIVE TRACK MAP
            </h3>

            <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center' }}>
                {trackLength > 0 ? (
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0px 0px 10px rgba(255, 255, 255, 0.1))' }}>
                        {/* Track Background */}
                        <path
                            d={trackPath}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="10"
                        />
                        {/* Track Core */}
                        <path
                            d={trackPath}
                            fill="none"
                            stroke="#333"
                            strokeWidth="6"
                        />

                        {/* Start/Finish Line */}
                        <line
                            x1={padding + rx}
                            y1={padding - 10}
                            x2={padding + rx}
                            y2={padding + 10}
                            stroke="white"
                            strokeWidth="4"
                            strokeDasharray="2 2"
                        />

                        {/* Cars */}
                        {participants.map((p, idx) => {
                            // Calculate percentage 0-100
                            const rawPercentage = (p.lap_distance / trackLength) * 100;
                            // Ensure it wraps around cleanly
                            const percentage = Math.max(0, Math.min(100, Math.abs(rawPercentage % 100)));

                            const pos = getCoordinateForPercentage(percentage);
                            const carColor = p.color || 'var(--silver)';

                            return (
                                <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="6"
                                        fill={carColor}
                                        stroke="white"
                                        strokeWidth="1.5"
                                        style={{ transition: 'all 0.5s linear' }}
                                    />
                                    <text
                                        x="0"
                                        y="-10"
                                        fill="white"
                                        fontSize="10px"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        style={{ transition: 'all 0.5s linear' }}
                                    >
                                        P{p.position}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                ) : (
                    <div style={{ padding: '2rem', color: 'var(--silver)', textAlign: 'center' }}>
                        Waiting for active track data...
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', justifyContent: 'center', width: '100%' }}>
                {participants.sort((a, b) => a.position - b.position).map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color || 'var(--silver)' }}></span>
                        <span style={{ color: 'white' }}>{p.game_name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
