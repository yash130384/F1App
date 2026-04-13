'use client';

import React, { useState, useEffect } from 'react';
import { getPointsConfig, updatePointsConfig } from '@/lib/actions';
import { DEFAULT_POINTS, DEFAULT_QUALI_POINTS, PointsConfig } from '@/lib/scoring';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import Link from 'next/link';

const PRESETS = {
  F1_CURRENT: {
    name: 'F1 Standard (2025)',
    points: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
    qualiPoints: DEFAULT_QUALI_POINTS,
    fastestLapBonus: 1
  },
  F1_CLASSIC: {
    name: 'F1 Classic (10-6-4-3-2-1)',
    points: { 1: 10, 2: 6, 3: 4, 4: 3, 5: 2, 6: 1 },
    qualiPoints: DEFAULT_QUALI_POINTS,
    fastestLapBonus: 0
  },
  FORMULA_E: {
    name: 'Formula E (incl. Pole Bonus)',
    points: { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
    qualiPoints: { 1: 3, 2: 0, 3: 0 },
    fastestLapBonus: 1
  }
};

export default function ScoringConfigPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'manual'>('presets');

  useEffect(() => {
    async function load() {
      const res = await getPointsConfig(leagueId);
      if (res.success && res.config) {
        setConfig(res.config);
      } else {
        setError(res.error || 'Failed to load config');
      }
      setLoading(false);
    }
    load();
  }, [leagueId]);

  const handleApplyPreset = (presetKey: keyof typeof PRESETS) => {
    if (!config) return;
    const preset = PRESETS[presetKey];
    setConfig({
      ...config,
      points: { ...preset.points },
      qualiPoints: { ...preset.qualiPoints },
      fastestLapBonus: preset.fastestLapBonus
    });
  };

  const isPresetActive = (presetKey: keyof typeof PRESETS) => {
    if (!config) return false;
    const p = PRESETS[presetKey];
    return JSON.stringify(config.points) === JSON.stringify(p.points) &&
           JSON.stringify(config.qualiPoints) === JSON.stringify(p.qualiPoints) &&
           config.fastestLapBonus === p.fastestLapBonus;
  };

  const handlePointChange = (pos: number, val: number, type: 'points' | 'qualiPoints') => {
    if (!config) return;
    setConfig({
      ...config,
      [type]: { ...config[type], [pos]: val }
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const res = await updatePointsConfig(leagueId, config);
    if (res.success) {
        alert('Points Configuration Updated!');
    } else {
        alert('Error: ' + res.error);
    }
    setSaving(false);
  };

  if (loading) return <LoadingState />;
  if (error || !config) return <ErrorState error={error || 'Config not found'} />;

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href={`/profile/leagues/${leagueId}`} className="btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                BACK
            </Link>
            <span className="text-f1" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>ADMINISTRATION</span>
        </div>
        <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>SCORING CONFIGURATION</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Define how points are awarded for race results and qualifying performance.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2.5rem' }}>
        <main>
            {/* Tab Selection */}
            <div style={{ display: 'flex', gap: '1px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px', marginBottom: '2rem', width: 'fit-content' }}>
                <button 
                    onClick={() => setActiveTab('presets')}
                    style={{ 
                        padding: '0.6rem 1.5rem', border: 'none', borderRadius: '2px', cursor: 'pointer',
                        background: activeTab === 'presets' ? 'var(--f1-red)' : 'transparent',
                        color: activeTab === 'presets' ? 'white' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', transition: 'all 0.2s'
                    }}
                >
                    PRESETS
                </button>
                <button 
                    onClick={() => setActiveTab('manual')}
                    style={{ 
                        padding: '0.6rem 1.5rem', border: 'none', borderRadius: '2px', cursor: 'pointer',
                        background: activeTab === 'manual' ? 'var(--f1-red)' : 'transparent',
                        color: activeTab === 'manual' ? 'white' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', transition: 'all 0.2s'
                    }}
                >
                    MANUAL OVERRIDE
                </button>
            </div>

            {activeTab === 'presets' && (
                <div className="flex flex-col gap-4">
                    {Object.entries(PRESETS).map(([key, p]) => {
                        const isActive = isPresetActive(key as any);
                        return (
                            <div key={key} className="f1-card flex justify-between items-center p-6" style={{ borderLeft: isActive ? '4px solid var(--f1-cyan)' : '4px solid var(--f1-red)' }}>
                                <div>
                                    <h3 className="text-f1" style={{ fontSize: '1.2rem', marginBottom: '4px', color: isActive ? 'var(--f1-cyan)' : 'white' }}>{p.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>P1: {(p.points as any)[1]}pts ... P10: {(p.points as any)[10] || 0}pts | Bonus: {p.fastestLapBonus} FL</p>
                                </div>
                                <button 
                                    className={isActive ? "btn-secondary btn-sm" : "btn-primary btn-sm"} 
                                    onClick={() => handleApplyPreset(key as any)}
                                    disabled={isActive}
                                >
                                    {isActive ? 'ACTIVE PRESET' : 'APPLY'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'manual' && (
                <div className="flex flex-col gap-8">
                    {/* Race Points Grid */}
                    <section>
                        <h3 className="text-f1-bold" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--f1-red)' }}>RACE POSITION POINTS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                            {Array.from({ length: 20 }).map((_, i) => {
                                const pos = i + 1;
                                return (
                                    <div key={pos} className="glass-panel p-3 flex items-center justify-between">
                                        <span className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>P{pos}</span>
                                        <input 
                                            type="number" 
                                            value={config.points[pos] || 0}
                                            onChange={(e) => handlePointChange(pos, parseInt(e.target.value) || 0, 'points')}
                                            style={{ background: 'transparent', border: 'none', color: 'white', width: '50px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid rgba(255,24,1,0.3)' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Qualifying Points Grid */}
                    <section>
                        <h3 className="text-f1-bold" style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--f1-cyan)' }}>QUALIFYING BONUS POINTS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                            {Array.from({ length: 10 }).map((_, i) => {
                                const pos = i + 1;
                                return (
                                    <div key={pos} className="glass-panel p-3 flex items-center justify-between" style={{ borderColor: 'rgba(0,245,255,0.1)' }}>
                                        <span className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Q{pos}</span>
                                        <input 
                                            type="number" 
                                            value={config.qualiPoints[pos] || 0}
                                            onChange={(e) => handlePointChange(pos, parseInt(e.target.value) || 0, 'qualiPoints')}
                                            style={{ background: 'transparent', border: 'none', color: 'white', width: '50px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid rgba(0,245,255,0.3)' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}
        </main>

        <aside>
            <div className="f1-card p-6" style={{ position: 'sticky', top: '100px' }}>
                <h3 className="text-f1" style={{ fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>CONFIGURATION</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--f1-red)', margin: 0 }}>FASTEST LAP BONUS</label>
                        <input 
                            type="number" 
                            className="input" 
                            style={{ width: '80px', background: 'white', color: 'black', textAlign: 'center', fontWeight: 'bold' }}
                            value={config.fastestLapBonus}
                            onChange={(e) => setConfig({ ...config, fastestLapBonus: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="input-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--f1-red)', margin: 0 }}>CLEAN DRIVER BONUS</label>
                        <input 
                            type="number" 
                            className="input" 
                            style={{ width: '80px', background: 'white', color: 'black', textAlign: 'center', fontWeight: 'bold' }}
                            value={config.cleanDriverBonus}
                            onChange={(e) => setConfig({ ...config, cleanDriverBonus: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--f1-red)', margin: 0 }}>DROPPED RESULTS</label>
                            <input 
                                type="number" 
                                className="input" 
                                style={{ width: '80px', background: 'white', color: 'black', textAlign: 'center', fontWeight: 'bold' }}
                                value={config.dropResultsCount || 0}
                                min="0"
                                onChange={(e) => setConfig({ ...config, dropResultsCount: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>Number of worst race results to automatically drop from standings.</span>
                    </div>

                    <div className="input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--f1-red)', display: 'block', marginBottom: '0.5rem' }}>TEAM COMPETITION</label>
                        <div className="flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                checked={config.teamCompetition}
                                onChange={(e) => setConfig({ ...config, teamCompetition: e.target.checked })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontSize: '0.85rem' }}>Enable team standings</span>
                        </div>
                    </div>

                    <button 
                        className="btn-primary w-full" 
                        style={{ height: '3.5rem', marginTop: '1rem' }}
                        disabled={saving}
                        onClick={handleSave}
                    >
                        {saving ? 'UPDATING...' : 'SAVE CONFIGURATION'}
                    </button>
                </div>
            </div>
        </aside>
      </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
