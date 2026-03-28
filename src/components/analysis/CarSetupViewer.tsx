'use client';

import React, { useMemo, useState } from 'react';

interface SetupData {
  m_frontWing: number;
  m_rearWing: number;
  m_onThrottle: number;
  m_offThrottle: number;
  m_frontCamber: number;
  m_rearCamber: number;
  m_frontToe: number;
  m_rearToe: number;
  m_frontSuspension: number;
  m_rearSuspension: number;
  m_frontAntiRollBar: number;
  m_rearAntiRollBar: number;
  m_frontSuspensionHeight: number;
  m_rearSuspensionHeight: number;
  m_brakePressure: number;
  m_brakeBias: number;
  m_rearLeftTyrePressure: number;
  m_rearRightTyrePressure: number;
  m_frontLeftTyrePressure: number;
  m_frontRightTyrePressure: number;
  m_ballast: number;
  m_fuelLoad: number;
}

interface ParticipantSetup {
  participant_id: string;
  driver_name: string;
  driver_color: string;
  game_name: string;
  lap_number: number;
  setup_json: string;
}

interface CarSetupViewerProps {
  setups: ParticipantSetup[];
}

interface SetupField {
  key: keyof SetupData;
  label: string;
  min: number;
  max: number;
  unit?: string;
  step?: number;
}

interface SetupCategory {
  name: string;
  fields: SetupField[];
}

const SETUP_CATEGORIES: SetupCategory[] = [
  {
    name: 'Aerodynamik',
    fields: [
      { key: 'm_frontWing', label: 'Vorderflügel', min: 0, max: 50 },
      { key: 'm_rearWing', label: 'Heckflügel', min: 0, max: 50 },
    ]
  },
  {
    name: 'Transmission',
    fields: [
      { key: 'm_onThrottle', label: 'Diff. mit Gas', unit: '%', min: 50, max: 100 },
      { key: 'm_offThrottle', label: 'Diff. ohne Gas', unit: '%', min: 50, max: 100 },
    ]
  },
  {
    name: 'Aufhängungsgeometrie',
    fields: [
      { key: 'm_frontCamber', label: 'Radsturz vorne', min: -3.5, max: -2.5, step: 0.1 },
      { key: 'm_rearCamber', label: 'Radsturz hinten', min: -2.0, max: -1.0, step: 0.1 },
      { key: 'm_frontToe', label: 'Spur vorne', min: 0.05, max: 0.15, step: 0.01 },
      { key: 'm_rearToe', label: 'Spur hinten', min: 0.2, max: 0.5, step: 0.01 },
    ]
  },
  {
    name: 'Fahrwerk',
    fields: [
      { key: 'm_frontSuspension', label: 'Vordere Aufhängung', min: 1, max: 41 },
      { key: 'm_rearSuspension', label: 'Hintere Aufhängung', min: 1, max: 41 },
      { key: 'm_frontAntiRollBar', label: 'Vorderer Stabi', min: 1, max: 21 },
      { key: 'm_rearAntiRollBar', label: 'Hinterer Stabi', min: 1, max: 21 },
      { key: 'm_frontSuspensionHeight', label: 'Bodenfreiheit vorne', min: 30, max: 50 },
      { key: 'm_rearSuspensionHeight', label: 'Bodenfreiheit hinten', min: 30, max: 50 },
    ]
  },
  {
    name: 'Bremsen',
    fields: [
      { key: 'm_brakePressure', label: 'Bremsdruck', unit: '%', min: 80, max: 100 },
      { key: 'm_brakeBias', label: 'Bremskraftv.', unit: '%', min: 50, max: 70 },
    ]
  },
  {
    name: 'Reifendruck',
    fields: [
      { key: 'm_frontLeftTyrePressure', label: 'Vorne Links', unit: ' PSI', min: 20, max: 25 },
      { key: 'm_frontRightTyrePressure', label: 'Vorne Rechts', unit: ' PSI', min: 20, max: 25 },
      { key: 'm_rearLeftTyrePressure', label: 'Hinten Links', unit: ' PSI', min: 20, max: 25 },
      { key: 'm_rearRightTyrePressure', label: 'Hinten Rechts', unit: ' PSI', min: 20, max: 25 },
    ]
  }
];

export default function CarSetupViewer({ setups }: CarSetupViewerProps) {
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  // Parse and deduplicate setups (keep latest per driver)
  const latestSetups = useMemo(() => {
    const map = new Map<string, any>();
    setups.forEach(s => {
      if (!map.has(s.participant_id)) {
        try {
          map.set(s.participant_id, {
            ...s,
            data: JSON.parse(s.setup_json) as SetupData
          });
        } catch (e) {
          console.error('Failed to parse setup json', e);
        }
      }
    });
    return Array.from(map.values());
  }, [setups]);

  const toggleDriver = (id: string) => {
    setSelectedDrivers(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const displaySetups = useMemo(() => {
    if (selectedDrivers.length === 0) return latestSetups.slice(0, 2);
    return latestSetups.filter(s => selectedDrivers.includes(s.participant_id));
  }, [latestSetups, selectedDrivers]);

  if (latestSetups.length === 0) {
    return (
      <div className="p-12 text-center glass-panel">
        <div className="text-f1-bold text-white/20 text-3xl mb-4 italic">NO SETUP DATA RECORDED</div>
        <p className="text-silver/60">F1 25 Telemetry packets required for setup analysis.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Driver Selector */}
      <div className="flex flex-wrap gap-3">
        {latestSetups.map(s => (
          <button
            key={s.participant_id}
            onClick={() => toggleDriver(s.participant_id)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-all ${
              selectedDrivers.includes(s.participant_id) || (selectedDrivers.length === 0 && displaySetups.includes(s))
                ? 'bg-f1-red/10 border-f1-red text-white shadow-[0_0_15px_rgba(232,0,45,0.2)]'
                : 'bg-white/5 border-white/10 text-silver hover:border-white/20'
            }`}
          >
            <div 
              className="w-2 h-4 rounded-full" 
              style={{ backgroundColor: s.driver_color || '#fff' }} 
            />
            <span className="text-f1-bold uppercase text-xs tracking-widest">{s.driver_name || s.game_name}</span>
          </button>
        ))}
      </div>

      {/* Setup Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SETUP_CATEGORIES.map(category => (
          <div key={category.name} className="glass-panel p-6 border-l-4 border-l-f1-red/50">
            <h3 className="text-f1-bold text-f1-red text-xs tracking-[0.2em] mb-6 uppercase flex items-center justify-between">
              {category.name}
              <span className="w-12 h-[1px] bg-f1-red/20"></span>
            </h3>
            
            <div className="flex flex-col gap-6">
              {category.fields.map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] text-silver uppercase tracking-wider font-bold">
                    <span>{field.label}</span>
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    {displaySetups.map(s => {
                      const val = s.data[field.key] as number;
                      const pct = ((val - field.min) / (field.max - field.min)) * 100;
                      
                      return (
                        <div key={s.participant_id} className="flex-1 flex flex-col gap-1">
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                            <div 
                              className="h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                              style={{ 
                                width: `${Math.max(0, Math.min(100, pct))}%`,
                                backgroundColor: s.driver_color || '#fff'
                              }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-silver/40 font-mono">{s.driver_name.split(' ').pop()}</span>
                            <span className="text-xs text-white font-mono font-bold">
                                {typeof val === 'number' ? val.toFixed(field.step ? 2 : 0) : 'N/A'}{field.unit || ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
