'use client';

import {
    getRaceDetails,
    getDriverRaceTelemetry,
    getDriverPositionHistory,
    getSessionSafetyCarEvents,
    getSessionFastestSectors,
    getDriverIncidents,
} from '@/lib/actions';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TyreStrategyChart } from '@/components/race/TyreStrategyChart';

function formatLapTime(ms: number): string {
    if (!ms || ms <= 0) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    return `${seconds}.${String(millis).padStart(3, '0')}`;
}

function formatSectorTime(ms: number): string {
    if (!ms || ms <= 0) return '-';
    const seconds = Math.floor(ms / 1000);
    const millis = ms % 1000;
    return `${seconds}.${String(millis).padStart(3, '0')}`;
}

function getTyreInfo(compoundId: number): { letter: string; color: string; textColor: string; name: string } {
    switch (compoundId) {
        case 16: return { letter: 'S', color: '#e8002d', textColor: 'white', name: 'Soft' };
        case 17: return { letter: 'M', color: '#ffd700', textColor: 'black', name: 'Medium' };
        case 18: return { letter: 'H', color: '#f0f0f0', textColor: 'black', name: 'Hard' };
        case 7:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 8:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        case 0:  return { letter: 'I', color: '#39b54a', textColor: 'white', name: 'Inter' };
        case 1:  return { letter: 'W', color: '#0067ff', textColor: 'white', name: 'Wet' };
        default: return { letter: '?', color: '#555', textColor: 'white', name: `ID ${compoundId}` };
    }
}

function TyreBadge({ compoundId }: { compoundId: number }) {
    const info = getTyreInfo(compoundId);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '20px', height: '20px', borderRadius: '50%',
            background: info.color, color: info.textColor,
            fontWeight: 900, fontSize: '0.6rem',
            border: '1.5px solid rgba(255,255,255,0.25)',
            flexShrink: 0, verticalAlign: 'middle'
        }} title={info.name}>
            {info.letter}
        </span>
    );
}

const DAMAGE_PARTS: { key: string; label: string; wing?: boolean }[] = [
    { key: 'frontLeftWingDamage',  label: 'FL-Flügel',   wing: true },
    { key: 'frontRightWingDamage', label: 'FR-Flügel',   wing: true },
    { key: 'rearWingDamage',       label: 'Heckflügel',  wing: true },
    { key: 'floorDamage',          label: 'Unterboden' },
    { key: 'diffuserDamage',        label: 'Diffusor' },
    { key: 'sidepodDamage',        label: 'Sidepod' },
    { key: 'gearBoxDamage',        label: 'Getriebe' },
    { key: 'engineDamage',         label: 'Motor' },
    { key: 'engineBlown',          label: 'Motor ausgefallen' },
];

interface DamageEvent {
    lap: number;
    newDamages: { label: string; from: number; to: number; key: string }[];
    repairs:    { label: string; from: number; to: number; key: string }[];
    isPitLap: boolean;
}

function computeDamageEvents(laps: any[]): DamageEvent[] {
    const events: DamageEvent[] = [];
    let prev: Record<string, number> = {};

    laps.forEach((lap: any) => {
        if (!lap.car_damage_json) return;
        let curr: Record<string, number>;
        try { curr = JSON.parse(lap.car_damage_json); } catch { return; }

        const newDamages: DamageEvent['newDamages'] = [];
        const repairs:    DamageEvent['repairs']    = [];

        DAMAGE_PARTS.forEach(({ key, label }) => {
            const from = prev[key] ?? 0;
            const to   = key === 'engineBlown' ? (curr[key] ? 100 : 0) : (curr[key] ?? 0);
            if (to > from)    newDamages.push({ label, from, to, key });
            else if (to < from) repairs.push({ label, from, to, key });
        });

        if (newDamages.length > 0 || repairs.length > 0) {
            events.push({ lap: lap.lap_number, newDamages, repairs, isPitLap: !!lap.is_pit_lap });
        }
        DAMAGE_PARTS.forEach(({ key }) => {
            prev[key] = key === 'engineBlown' ? (curr[key] ? 100 : 0) : (curr[key] ?? 0);
        });
    });
    return events;
}

function ChartEventLabel({ viewBox, value, color, bg }: any) {
    const { x, y } = viewBox;
    return (
        <g>
            <rect x={x - 8} y={y + 4} width={16} height={14} rx={3} fill={bg} fillOpacity={0.92} />
            <text x={x} y={y + 14} textAnchor="middle" fill={color} fontSize={8} fontWeight={900} fontFamily="monospace">{value}</text>
        </g>
    );
}

function DriverDetailContent() {
    const params = useParams() as { id: string, driverId: string };
    const searchParams = useSearchParams();
    const router = useRouter();

    const raceId = params.id;
    const driverId = params.driverId; // It's a UUID string!
    const leagueName = searchParams.get('league') || '';

    const [loading, setLoading] = useState(true);
    const [race, setRace] = useState<any>(null);
    const [driverRes, setDriverRes] = useState<any>(null);
    const [driverLaps, setDriverLaps] = useState<any[]>([]);
    const [positionHistory, setPositionHistory] = useState<any[]>([]);
    const [scEvents, setScEvents] = useState<any[]>([]);
    const [fastestSectors, setFastestSectors] = useState<{min_s1: number, min_s2: number, min_s3: number} | null>(null);
    const [incidents, setIncidents] = useState<any[]>([]);
    
    // Toggle state for engine/gearbox damage
    const [showHiddendamage, setShowHiddenDamage] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const rRes = await getRaceDetails(raceId);
            if (rRes.success && rRes.race) {
                setRace(rRes.race);
                const results = rRes.results || [];
                const dRes = results.find((r: any) => r.driver_id === driverId);
                setDriverRes(dRes || { driver_name: 'Unknown', driver_id: driverId, position: '-', points_earned: 0, quali_position: 0 });

                const sid = rRes.telemetrySessionId || null;

                const [telRes, posRes, scRes, sectRes, incRes] = await Promise.all([
                    getDriverRaceTelemetry(raceId.toString(), driverId.toString()),
                    getDriverPositionHistory(raceId.toString(), driverId.toString()),
                    sid ? getSessionSafetyCarEvents(sid) : Promise.resolve({ success: false, events: [] }),
                    sid ? getSessionFastestSectors(sid) : Promise.resolve({ success: false, fastestSectors: null }),
                    getDriverIncidents(raceId.toString(), driverId.toString())
                ]);

                if (telRes.success) setDriverLaps(telRes.laps || []);
                if (posRes.success && (posRes.positions?.length ?? 0) > 0) {
                    setPositionHistory(posRes.positions || []);
                }
                if (scRes.success && (scRes as any).events) {
                    setScEvents((scRes as any).events.filter((e: any) => e.event_type === 0));
                }
                if (sectRes.success && sectRes.fastestSectors) {
                    setFastestSectors(sectRes.fastestSectors);
                }
                if (incRes.success && incRes.incidents) {
                    setIncidents(incRes.incidents);
                }
            }
            setLoading(false);
        }

        if (raceId && driverId) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [raceId, driverId]);

    const leagueUrl = race?.league_id 
        ? `/dashboard?league=${race.league_id}` 
        : '/dashboard';
    const backLabel = race?.league_name || leagueName || 'Dashboard';
    const raceUrl = `/race/${raceId}?league=${race?.league_id || ''}`;

    const fastestLapMs = driverLaps.length > 0
        ? Math.min(...driverLaps.filter((l: any) => l.is_valid && l.lap_time_ms > 0).map((l: any) => l.lap_time_ms))
        : Infinity;

    const currentTyre = driverLaps.length > 0 ? driverLaps[driverLaps.length - 1]?.tyre_compound : null;

    const lastDamage = (() => {
        const withDmg = driverLaps.filter((l: any) => l.car_damage_json);
        if (withDmg.length === 0) return null;
        try { return JSON.parse(withDmg[withDmg.length - 1].car_damage_json); } catch { return null; }
    })();

    const driverPosData = (() => {
        if (!driverRes || positionHistory.length === 0) return [];
        return positionHistory.map((p: any) => ({ lap: p.lap_number, position: p.position }));
    })();

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-f1 animate-pulse" style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>LADE FAHRER...</div>
            </div>
        );
    }

    if (!race || !driverRes) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <div className="text-f1" style={{ fontSize: '1.5rem', color: 'var(--f1-red)' }}>FAHRER NICHT GEFUNDEN</div>
                <Link href={raceUrl} className="btn-secondary">↩ Zurück zum Rennen</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', padding: '1rem', paddingBottom: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <Link href={leagueUrl} className="text-f1" style={{ color: 'var(--silver)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    {backLabel}
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                <Link href={raceUrl} className="text-f1" style={{ color: 'var(--silver)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    {race.track_name || 'Rennen'}
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                <span className="text-f1" style={{ color: 'var(--white)', fontSize: '0.85rem' }}>{driverRes.driver_name}</span>
            </div>

            <div className="f1-card animate-fade-in" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: driverRes.driver_color || 'var(--f1-red)', flexShrink: 0 }} />
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h1 className="text-f1" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: 0 }}>{driverRes.driver_name}</h1>
                                {currentTyre != null && <TyreBadge compoundId={currentTyre} />}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--silver)', flexWrap: 'wrap', marginTop: '3px' }}>
                                <span>P{driverRes.position}</span>
                                {driverRes.quali_position > 0 && <span>Grid: P{driverRes.quali_position}</span>}
                                {driverRes.pit_stops > 0 && <span>{driverRes.pit_stops} Pit{driverRes.pit_stops > 1 ? 's' : ''}</span>}
                                {driverRes.penalties_time > 0 && <span style={{ color: 'var(--f1-red)' }}>+{driverRes.penalties_time}s Strafe</span>}
                                {driverRes.warnings > 0 && <span style={{ color: '#ff8700' }}>{driverRes.warnings} Verwarnungen</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {driverLaps.length > 0 ? (
                    <>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Rundenzeitverlauf</div>
                        <div style={{ width: '100%', height: 'clamp(200px, 35vw, 300px)', marginBottom: '2rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={driverLaps.map(l => ({ ...l, lap_time_ms: l.lap_time_ms > 0 ? l.lap_time_ms : null }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        {(() => {
                                            if (driverLaps.length === 0) return null;
                                            const minLap = Math.min(...driverLaps.map(d => d.lap_number));
                                            const maxLap = Math.max(...driverLaps.map(d => d.lap_number));
                                            const range = maxLap - minLap || 1;
                                            let stops: any[] = [];
                                            let curTyre = driverLaps[0]?.tyre_compound;
                                            stops.push(<stop key="s0" offset="0%" stopColor={getTyreInfo(curTyre).color} />);
                                            driverLaps.forEach(lap => {
                                                if (lap.tyre_compound !== curTyre && lap.tyre_compound !== undefined) {
                                                    const pct = `${((lap.lap_number - minLap) / range) * 100}%`;
                                                    stops.push(<stop key={`e${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(curTyre).color} />);
                                                    stops.push(<stop key={`s${lap.lap_number}`} offset={pct} stopColor={getTyreInfo(lap.tyre_compound).color} />);
                                                    curTyre = lap.tyre_compound;
                                                }
                                            });
                                            stops.push(<stop key="send" offset="100%" stopColor={getTyreInfo(curTyre).color} />);
                                            return (
                                                <linearGradient id="singleTyreGradient" x1="0" y1="0" x2="1" y2="0">
                                                    {stops}
                                                </linearGradient>
                                            );
                                        })()}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                    <XAxis dataKey="lap_number" stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} />
                                    <YAxis stroke="var(--silver)" tick={{ fill: 'var(--silver)', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={formatLapTime} width={65} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--f1-carbon-dark)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem' }}
                                        labelFormatter={(l) => `Runde ${l}`}
                                        formatter={(v: any, _key: any, props: any) => {
                                            const lap = driverLaps.find((l: any) => l.lap_number === props.payload?.lap_number);
                                            const tyrInfo = lap?.tyre_compound ? getTyreInfo(lap.tyre_compound) : null;
                                            return [
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {formatLapTime(v)}
                                                    {!lap?.is_valid && <span style={{ color: 'var(--f1-red)', fontSize: '0.7em', fontWeight: 900 }}>INV</span>}
                                                    {tyrInfo && <TyreBadge compoundId={lap.tyre_compound} />}
                                                </span>,
                                                'Rundenzeit'
                                            ];
                                        }}
                                    />
                                    {scEvents.map((e: any, i: number) => (
                                        <ReferenceLine key={`sc-${i}`} x={e.lap_number} stroke="#ffc107" strokeDasharray="4 3" strokeWidth={1.5}
                                            label={{ value: e.safety_car_type === 1 ? 'SC' : 'VSC', position: 'insideTopLeft', fill: '#ffc107', fontSize: 9 }} />
                                    ))}
                                    {driverLaps.filter((l: any) => l.is_pit_lap).map((l: any) => (
                                        <ReferenceLine key={`pit-${l.lap_number}`} x={l.lap_number} stroke="#ff8700"
                                            strokeWidth={1} strokeDasharray="3 2"
                                            label={<ChartEventLabel value="PIT" color="#ff8700" bg="rgba(255,135,0,0.18)" />} />
                                    ))}
                                    {incidents.filter((i: any) => i.type === 'COLLISION' && i.lap_num > 0).map((inc: any, idx: number) => (
                                        <ReferenceLine key={`coll-${idx}`} x={inc.lap_num} stroke="#ff0000"
                                            strokeWidth={1.5} strokeDasharray="3 3"
                                            label={<ChartEventLabel value="💥" color="#ff0000" bg="rgba(255,0,0,0.15)" />} />
                                    ))}
                                    {computeDamageEvents(driverLaps).map((ev, i) => {
                                        // Highlight specific damage rules
                                        const visibleDamages = ev.newDamages.filter(d => showHiddendamage || !['engineDamage', 'engineBlown', 'gearBoxDamage'].includes(d.key));
                                        const visibleRepairs = ev.repairs.filter(d => showHiddendamage || !['engineDamage', 'engineBlown', 'gearBoxDamage'].includes(d.key));

                                        const hasDmg = visibleDamages.length > 0;
                                        const hasRepair = visibleRepairs.length > 0;
                                        
                                        if (!hasDmg && !hasRepair) return null;

                                        const dmgLabel = ev.isPitLap && hasRepair ? (hasDmg ? '⚠🔧' : '🔧') : hasDmg ? '⚠' : null;
                                        if (!dmgLabel) return null;
                                        const dmgColor = hasDmg ? '#ff4444' : '#34c38f';
                                        const dmgBg   = hasDmg ? 'rgba(225,6,0,0.25)' : 'rgba(52,195,143,0.2)';
                                        return (
                                            <ReferenceLine key={`dmg-${i}`} x={ev.lap} stroke={dmgColor}
                                                strokeWidth={1} strokeDasharray="2 3"
                                                label={<ChartEventLabel value={dmgLabel} color={dmgColor} bg={dmgBg} />}
                                            />
                                        );
                                    })}
                                    <Line type="monotone" dataKey="lap_time_ms" stroke="url(#singleTyreGradient)" strokeWidth={3}
                                        dot={(props: any) => {
                                            const lap = driverLaps[props.index];
                                            if (!lap) return <g key={props.key} />;
                                            if (lap.is_pit_lap && lap.tyre_compound) {
                                                const info = getTyreInfo(lap.tyre_compound);
                                                return <circle key={props.key} cx={props.cx} cy={props.cy} r={6} fill={info.color} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />;
                                            }
                                            return <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill={!lap.is_valid ? 'rgba(225,6,0,0.3)' : 'rgba(225,6,0,0.7)'} />;
                                        }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase' }}>Fahrzeugschäden (Endstand)</div>
                                            <button 
                                                onClick={() => setShowHiddenDamage(!showHiddendamage)}
                                                className="btn-secondary" 
                                                style={{ fontSize: '0.65rem', padding: '2px 6px', background: showHiddendamage ? 'rgba(255,255,255,0.1)' : 'transparent', color: showHiddendamage ? 'white' : 'var(--silver)' }}
                                            >
                                                Motor/Getriebe {showHiddendamage ? 'AN' : 'AUS'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                                            {lastDamage ? (
                                                (() => {
                                                    const ds = DAMAGE_PARTS.map(x => ({ label: x.label, key: x.key, val: x.key === 'engineBlown' ? (lastDamage[x.key] ? 100 : 0) : lastDamage[x.key] })).filter(x => x.val > 0);
                                                    
                                                    const visibleDs = ds.filter(d => showHiddendamage || !['engineDamage', 'engineBlown', 'gearBoxDamage'].includes(d.key));

                                                    if (visibleDs.length === 0) return <div style={{ color: 'var(--silver)', fontSize: '0.85rem' }}>Keine nennenswerten Schäden</div>;
                                                    return visibleDs.map((d, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                            <span style={{ color: 'var(--silver)' }}>{d.label}</span>
                                                            <span style={{ color: d.val > 50 ? 'var(--f1-red)' : d.val > 20 ? '#ff8700' : 'var(--white)', fontWeight: 700 }}>{d.val}%</span>
                                                        </div>
                                                    ));
                                                })()
                                            ) : <div style={{ color: 'var(--silver)', fontSize: '0.85rem' }}>Keine Daten</div>}
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase', marginBottom: '10px' }}>Highlights</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span style={{ color: 'var(--silver)' }}>Start</span>
                                                <span style={{ fontWeight: 700 }}>P{driverRes.quali_position > 0 ? driverRes.quali_position : '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span style={{ color: 'var(--silver)' }}>Ziel</span>
                                                <span style={{ fontWeight: 700, color: driverRes.position < (driverRes.quali_position || 99) ? 'var(--success)' : 'var(--f1-red)' }}>P{driverRes.position}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span style={{ color: 'var(--silver)' }}>Bestzeit</span>
                                                <span style={{ fontWeight: 700, color: fastestLapMs === Infinity ? 'var(--silver)' : 'var(--white)' }}>
                                                    {fastestLapMs === Infinity ? '-' : formatLapTime(fastestLapMs)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                <span style={{ color: 'var(--silver)' }}>Punkte</span>
                                                <span style={{ fontWeight: 700, color: 'var(--f1-red)' }}>{driverRes.points_earned}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {driverLaps.length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {(() => {
                                            const computedStints: any[] = [];
                                            let currentStint: any = null;
                                            let stintNum = 1;
                                            let lastLapWasPit = false;

                                            for (const lap of driverLaps) {
                                                if (!currentStint || lastLapWasPit || lap.tyre_compound !== currentStint.tyre_compound) {
                                                    if (currentStint) {
                                                        currentStint.end_lap = lap.lap_number - 1;
                                                        computedStints.push(currentStint);
                                                    }
                                                    currentStint = {
                                                        stint_number: stintNum++,
                                                        tyre_compound: lap.tyre_compound || 0,
                                                        visual_compound: lap.tyre_compound || 0,
                                                        start_lap: lap.lap_number,
                                                        end_lap: lap.lap_number
                                                    };
                                                } else {
                                                    currentStint.end_lap = lap.lap_number;
                                                }
                                                lastLapWasPit = lap.is_pit_lap ? true : false;
                                            }
                                            if (currentStint) {
                                                computedStints.push(currentStint);
                                            }

                                            return (
                                                <TyreStrategyChart 
                                                    participants={[{
                                                        game_name: driverRes.driver_name || 'Driver',
                                                        position: driverRes.position,
                                                        stints: computedStints
                                                    }]}
                                                    totalLaps={driverLaps[driverLaps.length - 1].lap_number}
                                                />
                                            );
                                        })()}
                                    </div>
                                )}

                            </div>

                            <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '1px' }}>Alle Rundenzeiten</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--silver)' }}>({driverLaps.length} Runden)</span>
                                </div>
                                <div style={{ overflowX: 'auto', flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '460px' }}>
                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--f1-carbon)' }}>
                                            <tr style={{ fontSize: '0.7rem', color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                <th style={{ padding: '0.75rem' }}>Rd</th>
                                                <th style={{ padding: '0.75rem' }}>Zeit</th>
                                                <th style={{ padding: '0.75rem' }}>S1</th>
                                                <th style={{ padding: '0.75rem' }}>S2</th>
                                                <th style={{ padding: '0.75rem' }}>S3</th>
                                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Info</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const dmgEvents = computeDamageEvents(driverLaps);
                                                const dmgByLap = new Map(dmgEvents.map(e => [e.lap, e]));
                                                
                                                const validLaps = driverLaps.filter(l => l.is_valid);
                                                const pbS1 = validLaps.filter(l => l.sector1_ms > 0).length > 0 ? Math.min(...validLaps.filter(l => l.sector1_ms > 0).map(l => l.sector1_ms)) : Infinity;
                                                const pbS2 = validLaps.filter(l => l.sector2_ms > 0).length > 0 ? Math.min(...validLaps.filter(l => l.sector2_ms > 0).map(l => l.sector2_ms)) : Infinity;
                                                const pbS3 = validLaps.filter(l => l.sector3_ms > 0).length > 0 ? Math.min(...validLaps.filter(l => l.sector3_ms > 0).map(l => l.sector3_ms)) : Infinity;
                                                
                                                return driverLaps.map((lap) => {
                                                    const isFastest = lap.is_valid && lap.lap_time_ms === fastestLapMs;
                                                    const dmgEv = dmgByLap.get(lap.lap_number);
                                                    
                                                    const visibleDamages = dmgEv?.newDamages.filter(d => showHiddendamage || !['engineDamage', 'engineBlown', 'gearBoxDamage'].includes(d.key)) || [];
                                                    const visibleRepairs = dmgEv?.repairs.filter(d => showHiddendamage || !['engineDamage', 'engineBlown', 'gearBoxDamage'].includes(d.key)) || [];
                                                    const lapCollisions = incidents.filter(i => i.type === 'COLLISION' && i.lap_num === lap.lap_number);
                                                    
                                                    const hasVisibleDmg = visibleDamages.length > 0;
                                                    
                                                    const s1Purple = fastestSectors && fastestSectors.min_s1 && lap.sector1_ms && lap.sector1_ms <= (fastestSectors.min_s1 + 2) && lap.is_valid;
                                                    const s2Purple = fastestSectors && fastestSectors.min_s2 && lap.sector2_ms && lap.sector2_ms <= (fastestSectors.min_s2 + 2) && lap.is_valid;
                                                    const s3Purple = fastestSectors && fastestSectors.min_s3 && lap.sector3_ms && lap.sector3_ms <= (fastestSectors.min_s3 + 2) && lap.is_valid;

                                                    const s1Green = !s1Purple && pbS1 !== Infinity && lap.sector1_ms && lap.sector1_ms <= (pbS1 + 2) && lap.is_valid;
                                                    const s2Green = !s2Purple && pbS2 !== Infinity && lap.sector2_ms && lap.sector2_ms <= (pbS2 + 2) && lap.is_valid;
                                                    const s3Green = !s3Purple && pbS3 !== Infinity && lap.sector3_ms && lap.sector3_ms <= (pbS3 + 2) && lap.is_valid;

                                                    return (
                                                        <tr key={lap.lap_number} style={{
                                                            background: lap.is_pit_lap ? 'rgba(255,255,255,0.03)' : hasVisibleDmg ? 'rgba(255, 135, 0, 0.05)' : 'transparent',
                                                            borderBottom: '1px solid rgba(255,255,255,0.02)'
                                                        }}>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--silver)', fontSize: '0.85rem' }}>{lap.lap_number}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: isFastest ? '#9c27b0' : !lap.is_valid ? 'var(--f1-red)' : 'var(--white)', fontWeight: isFastest ? 900 : 400, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                                {formatLapTime(lap.lap_time_ms)}
                                                                {isFastest && <span style={{ fontSize: '0.5rem', marginLeft: '6px', background: '#9c27b0', color: 'white', padding: '1px 3px', borderRadius: '3px' }}>FL</span>}
                                                            </td>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: s1Purple ? '#9c27b0' : s1Green ? '#34c38f' : 'var(--silver)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: s1Purple || s1Green ? 900 : 400 }}>{formatSectorTime(lap.sector1_ms)}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: s2Purple ? '#9c27b0' : s2Green ? '#34c38f' : 'var(--silver)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: s2Purple || s2Green ? 900 : 400 }}>{formatSectorTime(lap.sector2_ms)}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', color: s3Purple ? '#9c27b0' : s3Green ? '#34c38f' : 'var(--silver)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: s3Purple || s3Green ? 900 : 400 }}>{formatSectorTime(lap.sector3_ms)}</td>
                                                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                    {lap.tyre_compound != null && <TyreBadge compoundId={lap.tyre_compound} />}
                                                                    {lap.is_pit_lap && <span style={{ background: '#ff8700', color: 'white', fontSize: '0.55rem', padding: '2px 4px', borderRadius: '3px', fontWeight: 900 }}>PIT</span>}
                                                                    {!lap.is_valid && <span style={{ background: 'var(--f1-red)', color: 'white', fontSize: '0.55rem', padding: '2px 4px', borderRadius: '3px', fontWeight: 900 }} title="Runde Ungültig">INV</span>}
                                                                    
                                                                    {lapCollisions.length > 0 && (
                                                                        <span title={lapCollisions.map((c: any) => `Kollision mit ${c.other_driver || 'Unbekannt'}`).join(' | ')}
                                                                            style={{ background: 'rgba(255,0,0,0.8)', color: 'white', fontSize: '0.55rem', padding: '2px 4px', borderRadius: '3px', fontWeight: 900, cursor: 'help' }}
                                                                        >💥 COLL</span>
                                                                    )}

                                                                    {visibleDamages.length > 0 && (
                                                                        <span title={visibleDamages.map(d => `${d.label}: ${d.from}→${d.to}%`).join(', ')}
                                                                            style={{ background: 'rgba(225,6,0,0.8)', color: 'white', fontSize: '0.55rem', padding: '2px 4px', borderRadius: '3px', fontWeight: 900, cursor: 'help' }}
                                                                        >⚠ {visibleDamages.map(d => d.label).join(', ')}</span>
                                                                    )}
                                                                    
                                                                    {visibleRepairs.length > 0 && lap.is_pit_lap && (
                                                                        <span title={visibleRepairs.map(d => `${d.label} repariert`).join(', ')}
                                                                            style={{ background: 'rgba(52,195,143,0.8)', color: 'white', fontSize: '0.55rem', padding: '2px 4px', borderRadius: '3px', fontWeight: 900, cursor: 'help' }}
                                                                        >🔧 REP</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--silver)', fontSize: '0.9rem' }}>
                        Keine Telemetrie-Details für diesen Fahrer verfügbar.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DriverDetailPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-f1 animate-pulse" style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>LADE...</div>
            </div>
        }>
            <DriverDetailContent />
        </Suspense>
    );
}
