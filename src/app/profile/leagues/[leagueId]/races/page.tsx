'use client';

import React, { useState, useEffect } from 'react';
import { getLeagueRaces, deleteRace, scheduleRace, getPointsConfig, updateTrackPool } from '@/lib/actions';
import { LoadingState, ErrorState } from '../_components/StatusScreens';
import { F1_TRACKS_2025 } from '@/lib/constants';
import Link from 'next/link';

export default function RaceManagementPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = React.use(params);
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track Pool state
  const [trackPool, setTrackPool] = useState<string[]>([]);
  const [showPoolManager, setShowPoolManager] = useState(false);

  // Scheduling state
  const [showForm, setShowForm] = useState(false);
  const [track, setTrack] = useState(Object.values(F1_TRACKS_2025)[0]);
  const [date, setDate] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
  });
  const [isRandom, setIsRandom] = useState(false);
  const [revealHours, setRevealHours] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRaces();
  }, [leagueId]);

  async function loadRaces() {
    setLoading(true);
    const [res, pointsRes] = await Promise.all([
        getLeagueRaces(leagueId),
        getPointsConfig(leagueId)
    ]);
    if (res.success) {
      setRaces(res.races || []);
    } else {
      setError(res.error || 'Failed to load races');
    }
    if (pointsRes.success) {
        setTrackPool(pointsRes.config?.trackPool || []);
    }
    setLoading(false);
  }

  const handleDelete = async (raceId: string) => {
    if (!confirm('Möchtest du dieses geplante Event wirklich löschen? Ergebnisse bleiben unberührt falls vorhanden.')) return;
    
    const res = await deleteRace(raceId);
    if (res.success) {
      setRaces(races.filter(r => r.id !== raceId));
    } else {
      alert('Fehler beim Löschen: ' + res.error);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const res = await scheduleRace(leagueId, { track, date, isRandom, revealHours });
    
    if (res.success) {
      setShowForm(false);
      alert("Event erfolgreich geplant!");
      loadRaces();
    } else {
      alert("Fehler bei der Planung: " + res.error);
    }
    setSubmitting(false);
  };

  if (loading && races.length === 0) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '1000px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Link href={`/profile/leagues/${leagueId}`} className="btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                ZURÜCK
            </Link>
            <span className="text-f1" style={{ color: 'var(--f1-red)', fontSize: '0.8rem', letterSpacing: '2px' }}>ADMINISTRATION</span>
        </div >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <h1 className="text-f1 text-gradient" style={{ fontSize: '3rem' }}>RENNKALENDER</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Verwalte alle Events und Ergebnisse deiner Liga.</p>
            </div >
            <div className="flex gap-4">
                <button className={`btn-secondary ${showPoolManager ? 'active' : ''}`} onClick={() => { setShowPoolManager(!showPoolManager); setShowForm(false); }}>
                    {showPoolManager ? 'ABBRECHEN' : 'RENNPOOL VERWALTEN'}
                </button>
                <button className={`btn-secondary ${showForm ? 'active' : ''}`} onClick={() => { setShowForm(!showForm); setShowPoolManager(false); }}>
                    {showForm ? 'ABBRECHEN' : 'RENNEN PLANEN'}
                </button>
                <Link href={`/profile/leagues/${leagueId}/results`}>
                    <button className="btn-primary">ERGEBNIS EINTRAGEN</button>
                </Link>
            </div >
        </div >
      </header>

      {showPoolManager && (
          <div className="f1-card p-8 mb-12 animate-fade-in" style={{ border: '2px solid var(--f1-cyan)' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1, fontSize: '4rem', fontWeight: 900, pointerEvents: 'none' }}>POOL</div >
              <h2 className="text-f1 mb-6 text-cyan" style={{ color: 'var(--f1-cyan)' }}>RENNPOOL VERWALTEN</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-h-96 overflow-y-auto">
                  {Object.values(F1_TRACKS_2025).map((t) => (
                      <label key={t} className="flex items-center gap-3 p-3 bg-carbon-900 border border-glass rounded cursor-pointer hover:bg-carbon-800 text-white">
                          <input 
                               type="checkbox" 
                               checked={trackPool.includes(t)}
                               onChange={(e) => {
                                   if (e.target.checked) setTrackPool([...trackPool, t]);
                                   else setTrackPool(trackPool.filter(x => x !== t));
                               }}
                               style={{ accentColor: 'var(--f1-cyan)' }}
                           />
                           <span className="text-sm">{t}</span>
                       </label>
                   ))}
               </div >
               <div className="flex justify-end gap-4">
                   <button onClick={async () => {
                       setSubmitting(true);
                       await updateTrackPool(leagueId, trackPool);
                       setShowPoolManager(false);
                       setSubmitting(false);
                   }} disabled={submitting} className="btn-primary" style={{ background: 'var(--f1-cyan)', color: 'black' }}>
                       {submitting ? 'SPEICHERN...' : 'POOL SPEICHERN'}
                   </button>
               </div >
           </div >
       )}

       {showForm && (
           <form onSubmit={handleSchedule} className="f1-card p-8 mb-12 animate-fade-in" style={{ border: '2px solid var(--f1-red)' }}>
                 <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1, fontSize: '4rem', fontWeight: 900, pointerEvents: 'none' }}>SCHEDULE</div >
               <h2 className="text-f1 mb-6">EVENT PLANEN</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                     <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)', marginBottom: '0.5rem' }}>STRECKE / LOCATION</label>
                     <select 
                         value={track} 
                         onChange={(e) => setTrack(e.target.value)}
                         disabled={isRandom}
                         className="w-full bg-slate-100 border border-glass p-3 rounded"
                         style={{ border: isRandom ? '1px solid var(--glass-border)' : '1px solid var(--f1-red)', color: 'black' }}
                     >
                          {isRandom ? <option value="RANDOM">Zufällige Strecke aus Pool</option> : Object.values(F1_TRACKS_2025).map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                 </div >
                 <div>
                     <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'var(--silver)', marginBottom: '0.5rem' }}>RENNTAG & UHRZEIT</label>
                     <input 
                         type="datetime-local" 
                         value={date} 
                         onChange={(e) => setDate(e.target.value)}
                         className="w-full bg-slate-100 border border-glass p-3 rounded"
                         style={{ border: '1px solid var(--glass-border)', color: 'black' }}
                     />
                 </div >
               </div >
 
               <div className="flex flex-col md:flex-row gap-10 mb-8 p-4 bg-carbon-800/20 rounded border border-glass">
                   <label className="flex items-center gap-4 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={isRandom} 
                         onChange={(e) => setIsRandom(e.target.checked)}
                         style={{ width: '24px', height: '24px', accentColor: 'var(--f1-red)' }}
                       />
                       <div>
                           <span className="font-bold text-sm">RANDOM MODE</span>
                           <p style={{ fontSize: '0.65rem', color: 'var(--silver)' }}>Wählt automatisch eine zufällige Strecke aus dem Pool.</p>
                       </div >
                   </label>
 
                   <div className="flex items-center gap-4">
                       <div className="flex flex-col">
                           <span className="font-bold text-sm">REVEAL TIME (STUNDEN)</span>
                           <p style={{ fontSize: '0.65rem', color: 'var(--silver)' }}>Zeit vor dem Rennen, in der die Strecke bekannt gegeben wird.</p>
                       </div >
                       <input 
                         type="number" 
                         value={revealHours} 
                         onChange={(e) => setRevealHours(parseInt(e.target.value))}
                         min="0"
                         className="bg-carbon-900 border border-f1-red text-center p-2 rounded"
                         style={{ width: '80px', color: 'white', fontWeight: 'bold' }}
                       />
                   </div >
               </div >
 
               <div className="flex justify-end">
                   <button type="submit" disabled={submitting} className="btn-primary" style={{ minWidth: '220px', height: '3.5rem' }}>
                       {submitting ? 'PLANUNG LÄUFT...' : 'EVENT JETZT PLANEN'}
                   </button>
               </div >
           </form>
       )}
 
       {races.length === 0 ? (
         <div className="f1-card p-12 text-center" style={{ opacity: 0.5 }}>
             <h3 className="text-f1">KEINE RENNEN GEPLANT</h3>
             <p>Plane ein neues Event oder trage ein Ergebnis ein, um zu beginnen.</p>
         </div >
       ) : (
         <div className="flex flex-col gap-4">
             {races.map((race) => (
                 <div key={race.id} className="f1-card flex justify-between items-center p-6" style={{ borderLeft: race.isFinished ? '4px solid var(--f1-red)' : '4px solid var(--f1-cyan)' }}>
                     <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-3">
                             <span className="text-f1" style={{ fontSize: '1.2rem' }}>{race.track}</span>
                             <span style={{ 
                                 fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', 
                                 background: race.isFinished ? 'rgba(255,24,1,0.2)' : 'rgba(0,245,255,0.1)', 
                                 color: race.isFinished ? 'var(--f1-red)' : 'var(--f1-cyan)', border: '1px solid currentColor', fontWeight: 900 
                             }}>
                                 {race.isFinished ? 'FINISHED' : 'SCHEDULED'}
                             </span>
                             {race.isRandom ? <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,183,0,0.1)', color: '#ffb700', border: '1px solid #ffb700', fontWeight: 900 }}>RANDOM</span> : null}
                         </div>
                         <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--silver)' }}>
                             <span className="flex items-center gap-1">
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"/></svg>
                                 {race.scheduledDate ? new Date(race.scheduledDate).toLocaleString() : 'Kein Datum'}
                             </span>
                             {race.revealHoursBefore > 0 && (
                                 <span className="flex items-center gap-1" style={{ color: '#ffb700' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                     Reveal: {race.revealHoursBefore}h
                                 </span>
                             )}
                         </div>
                     </div>
 
                     <div className="flex items-center gap-3">
                         {race.isFinished ? (
                             <Link href={`/profile/leagues/${leagueId}/results?raceId=${race.id}`}>
                                 <button className="btn-secondary btn-sm" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>RESULTS</button>
                             </Link>
                         ) : (
                             <Link href={`/profile/leagues/${leagueId}/results?raceId=${race.id}`}>
                                 <button className="btn-primary btn-sm">FINISH RACE</button>
                             </Link>
                         )}
                         <button className="btn-secondary btn-sm" style={{ color: 'var(--f1-red)', borderColor: 'rgba(255,24,1,0.2)' }} onClick={() => handleDelete(race.id)}>DELETE</button>
                     </div>
                 </div>
             ))}
         </div>
       )}
 
       <style jsx>{`
         .animate-fade-in { animation: fadeIn 0.4s ease-out; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
       `}</style>
     </div>
   );
 }