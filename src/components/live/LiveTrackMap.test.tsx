import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveTrackMap } from './LiveTrackMap';
import React from 'react';

// Mock für Track-Daten
vi.mock('@/lib/trackData', () => ({
  getTrackLayout: vi.fn().mockReturnValue({
    name: 'Silverstone Circuit',
    path: 'M 0 0 L 100 100',
    viewBox: '0 0 100 100'
  })
}));

describe('LiveTrackMap Component Smoke Test', () => {
  const mockPlayers = [
    { gameName: 'Verstappen', lapDistance: 3000, position: 1, isHuman: true },
    { gameName: 'Hamilton', lapDistance: 2500, position: 2, isHuman: true }
  ];

  it('renders track identification correctly', () => {
    render(
      <LiveTrackMap 
        trackId={1} 
        trackLength={5891} 
        players={mockPlayers} 
        selectedDriver="Verstappen" 
      />
    );
    
    // Check for track name and length
    expect(screen.getByText(/Silverstone Circuit/i)).toBeDefined();
    expect(screen.getByText(/5891m/i)).toBeDefined();
  });
});
