'use client';

import React, { useState, useEffect } from 'react';
import { getLeagueTeams, addLeagueTeam, updateLeagueTeam, deleteLeagueTeam, getLeagueById, updateLeagueSettings } from '@/lib/actions';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import Link from 'next/link';

export default function TeamManagementPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [teams, setTeams] = useState<any[]>([]);
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#ff1801');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [leagueId]);

  async function loadData() {
    setLoading(true);
    const [teamsRes, leagueRes] = await Promise.all([
      getLeagueTeams(leagueId),
      getLeagueById(leagueId)
    ]);

    if (teamsRes.success) setTeams(teamsRes.teams || []);
    if (leagueRes.success) setLeague(leagueRes.league);
    
    if (!teamsRes.success || !leagueRes.success) {
      setError(teamsRes.error || leagueRes.error || 'Failed to load data');
    }
    setLoading(false);
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setSaving(true);
    const res = await addLeagueTeam(leagueId, newTeamName, newTeamColor);
    if (res.success) {
      setNewTeamName('');
      loadData();
    } else {
      alert('Error: ' + res.error);
    }
    setSaving(false);
  };

  const handleUpdateTeam = async (id: string, name: string, color: string) => {
    setSaving(true);
    const res = await updateLeagueTeam(leagueId, id, name, color);
    if (res.success) {
      setEditingId(null);
      loadData();
    } else {
      alert('Error: ' + res.error);
    }
    setSaving(false);
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Delete this team? Drivers assigned to it will become unassigned.')) return;
    const res = await deleteLeagueTeam(leagueId, id);
    if (res.success) {
      loadData();
    } else {
      alert('Error: ' + res.error);
    }
  };

  const toggleLock = async () => {
    if (!league) return;
    const nextLocked = !league.teamsLocked;
    setSaving(true);
    const res = await updateLeagueSettings(leagueId, { teamsLocked: nextLocked });
    if (res.success) {
      setLeague({ ...league, teamsLocked: nextLocked });
    }
    setSaving(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href={`/profile/leagues/${leagueId}`} className="btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                BACK
            </Link>
            <span className="text-f1" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>ADMINISTRATION</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>TEAM MANAGEMENT</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Configure the constructors competing in this league.</p>
            </div>
            <div className="flex items-center gap-4 glass-panel p-3 px-6" style={{ borderColor: league?.teamsLocked ? 'var(--f1-red)' : 'rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: league?.teamsLocked ? 'var(--f1-red)' : 'var(--silver)' }}>
                        {league?.teamsLocked ? 'ROSTER LOCKED' : 'ROSTER OPEN'}
                    </div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>Drivers can't change teams when locked</div>
                </div>
                <button 
                    onClick={toggleLock}
                    className={league?.teamsLocked ? 'btn-primary' : 'btn-secondary'} 
                    style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                    disabled={saving}
                >
                    {league?.teamsLocked ? 'UNLOCK' : 'LOCK TEAMS'}
                </button>
            </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2.5rem' }}>
        <main>
            <div className="flex flex-col gap-3">
                {teams.length === 0 ? (
                    <div className="f1-card p-12 text-center" style={{ opacity: 0.5 }}>
                        <p>No teams defined for this league yet.</p>
                    </div>
                ) : (
                    teams.map((t) => (
                        <div key={t.id} className="f1-card flex justify-between items-center p-4" style={{ borderLeft: `6px solid ${t.color || 'var(--f1-red)'}` }}>
                            {editingId === t.id ? (
                                <div className="flex items-center gap-4 w-full">
                                    <input 
                                        type="text" className="input" style={{ flex: 1 }} 
                                        defaultValue={t.name}
                                        id={`name-${t.id}`}
                                    />
                                    <input 
                                        type="color" defaultValue={t.color}
                                        id={`color-${t.id}`}
                                        style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none' }}
                                    />
                                    <button 
                                        className="btn-primary btn-sm"
                                        onClick={() => {
                                            const n = (document.getElementById(`name-${t.id}`) as HTMLInputElement).value;
                                            const c = (document.getElementById(`color-${t.id}`) as HTMLInputElement).value;
                                            handleUpdateTeam(t.id, n, c);
                                        }}
                                    >SAVE</button>
                                    <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)}>CANCEL</button>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="text-f1" style={{ fontSize: '1.2rem' }}>{t.name}</h3>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--silver)', textTransform: 'uppercase' }}>UUID: {t.id.slice(0,8)}...</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="btn-secondary btn-sm" onClick={() => setEditingId(t.id)}>EDIT</button>
                                        <button className="btn-secondary btn-sm" style={{ color: 'var(--f1-red)', borderColor: 'rgba(255,24,1,0.1)' }} onClick={() => handleDeleteTeam(t.id)}>DELETE</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </main>

        <aside>
            <div className="f1-card p-6">
                <h3 className="text-f1" style={{ fontSize: '1.1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>ADD NEW TEAM</h3>
                <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                        <label className="text-f1" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', marginBottom: '0.5rem', display: 'block' }}>TEAM NAME</label>
                        <input 
                            type="text" className="input w-full" placeholder="e.g. Scuderia Ferrari"
                            value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label className="text-f1" style={{ fontSize: '0.7rem', color: 'var(--f1-red)', marginBottom: '0.5rem', display: 'block' }}>BRAND COLOR</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="color" className="w-12 h-12 p-0 border-none bg-none"
                                value={newTeamColor} onChange={e => setNewTeamColor(e.target.value)}
                            />
                            <span className="text-mono" style={{ fontSize: '0.9rem' }}>{newTeamColor}</span>
                        </div>
                    </div>
                    <button className="btn-primary w-full" style={{ height: '3.5rem' }} disabled={saving}>
                        {saving ? 'PROCESSING...' : 'CREATE TEAM'}
                    </button>
                </form>
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
