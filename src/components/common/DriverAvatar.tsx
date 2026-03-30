'use client';

import React from 'react';

interface DriverAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  borderColor?: string;
}

/**
 * Standard-Komponente für Fahrer-Profilbilder (Avatare).
 * Bietet ein Fallback auf Initialen, wenn kein Bild vorhanden ist.
 */
export default function DriverAvatar({ 
  src, 
  name, 
  size = 40, 
  className = "", 
  borderColor 
}: DriverAvatarProps) {
  const [error, setError] = React.useState(false);

  // Initialen extrahieren für den Fallback
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    borderRadius: '4px', // Boxy style
    overflow: 'hidden',
    position: 'relative',
    background: 'rgba(255,255,255,0.05)',
    border: borderColor ? `2px solid ${borderColor}` : '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (src && !error) {
    return (
      <div style={containerStyle} className={className}>
        <img 
          src={src} 
          alt={name || 'Driver Avatar'} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <span style={{ 
        fontSize: `${size * 0.4}px`, 
        fontWeight: 900, 
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic'
      }}>
        {initials}
      </span>
      {/* Visual Accent for fallback */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        right: 0, 
        width: '4px', 
        height: '4px', 
        background: borderColor || 'var(--f1-red)' 
      }} />
    </div>
  );
}
