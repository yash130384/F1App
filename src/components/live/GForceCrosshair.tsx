'use client';

import React, { useRef, useEffect } from 'react';

interface GForceCrosshairProps {
    lateral: number;        // gForceLateral
    longitudinal: number;   // gForceLongitudinal (+ = accel, - = brake)
    vertical: number;       // gForceVertical
    maxG?: number;          // Skalierung (default 4g)
    trailLength?: number;   // Anzahl gespeicherter Positionen
}

const TRAIL_MAX = 40;
const DOT_RADIUS = 6;

export function GForceCrosshair({
    lateral,
    longitudinal,
    vertical,
    maxG = 4,
    trailLength = TRAIL_MAX,
}: GForceCrosshairProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trailRef = useRef<Array<{ x: number; y: number }>>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;

        // Map G-forces to canvas coords
        // Lateral: left(-) / right(+) → X
        // Longitudinal: braking(-) / accel(+) → Y (inverted so accel is up)
        const nx = cx + (lateral / maxG) * cx;
        const ny = cy - (longitudinal / maxG) * cy;

        // Add to trail
        trailRef.current.push({ x: nx, y: ny });
        if (trailRef.current.length > trailLength) {
            trailRef.current.shift();
        }

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Background circles
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let r = 1; r <= 4; r++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (cx * r) / 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crosshair lines
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

        // G labels
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${maxG}G`, cx, 12);
        ctx.fillText(`${maxG}G`, cx, H - 4);
        ctx.textAlign = 'left';
        ctx.fillText(`${maxG}G`, W - 22, cy - 3);
        ctx.fillText(`${maxG}G`, 4, cy - 3);

        // Trail
        const trail = trailRef.current;
        for (let i = 0; i < trail.length - 1; i++) {
            const alpha = (i / trail.length) * 0.6;
            const size = DOT_RADIUS * (0.3 + (i / trail.length) * 0.5);
            ctx.beginPath();
            ctx.arc(trail[i].x, trail[i].y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(239,68,68,${alpha})`;
            ctx.fill();
        }

        // Current dot
        const gTotal = Math.sqrt(lateral * lateral + longitudinal * longitudinal);
        const dotColor = gTotal > 3 ? '#ef4444' : gTotal > 1.5 ? '#f97316' : '#22c55e';
        ctx.beginPath();
        ctx.arc(nx, ny, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.shadowColor = dotColor;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Labels: sector axis
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ACCEL', cx, 22);
        ctx.fillText('BRAKE', cx, H - 14);

    }, [lateral, longitudinal, maxG, trailLength]);

    const gTotal = Math.sqrt(lateral * lateral + longitudinal * longitudinal).toFixed(2);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                    G-Forces
                </span>
                <span style={{ fontSize: 12, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                    {gTotal}G Total
                </span>
            </div>
            <canvas
                ref={canvasRef}
                width={180}
                height={180}
                style={{ borderRadius: 8, display: 'block', margin: '0 auto' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 10, color: '#888' }}>
                <span>Lat: <b style={{ color: '#fff' }}>{lateral.toFixed(2)}G</b></span>
                <span>Long: <b style={{ color: '#fff' }}>{longitudinal.toFixed(2)}G</b></span>
                <span>Vert: <b style={{ color: '#fff' }}>{vertical.toFixed(2)}G</b></span>
            </div>
        </div>
    );
}
