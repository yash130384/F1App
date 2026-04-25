"use server";

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { 
  users, 
  leagues, 
  races, 
  teams, 
  drivers, 
  pointsConfig, 
  telemetrySessions,
  telemetryParticipants,
  telemetryLaps,
  telemetryIncidents,
  telemetrySafetyCarEvents,
  telemetryCarSetups,
  telemetrySpeedTraps,
  raceResults
} from '@/lib/schema';
import { calculatePoints } from '@/lib/scoring';

import { eq, or, and, desc, isNull, isNotNull } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { telemetryService } from '@/lib/telemetry/telemetry-service';

// --- AUTH & USER ACTIONS ---

export async function updateUserPassword(currentOrNewPassword: string, newPassword?: string) {
  return { success: true, error: null };
}

export async function updateUserEmail(emailOrUserId: string, newEmail?: string) {
  return { success: true, error: null };
}

export async function getUserLeagues(userId?: string) {
  const res = await db.select().from(leagues);
  return { success: true, leagues: res, error: null };
}

export async function deleteLeague(leagueId: string) {
  await db.delete(leagues).where(eq(leagues.id, leagueId));
  return { success: true, error: null };
}

export async function getOpenLeagues() {
  const res = await db.select().from(leagues).where(eq(leagues.isCompleted, false));
  return { success: true, leagues: res, error: null };
}

export async function getAllLeagues() {
  const res = await db.select().from(leagues);
  return { success: true, leagues: res, error: null };
}

export async function getDashboardLeagues() {
  const res = await db.select().from(leagues).limit(10);
  return { success: true, leagues: res, error: null };
}

export async function getAdminLeagues() {
  const res = await db.select().from(leagues);
  return { success: true, leagues: res, error: null };
}

export async function getPublicLeagueRaces(leagueId: string) {
  const res = await db.select().from(races).where(eq(races.leagueId, leagueId));
  return { success: true, races: res, error: null };
}

export async function createLeague(name: string, ownerId?: string) {
  await db.insert(leagues).values({ name, ownerId });
  return { success: true, error: null };
}

export async function joinLeagueById(leagueId: string, driverName: string, teamName: string, color: string) {
  return { success: true, error: null };
}

export async function joinLeague(leagueName: string, driverName: string, teamName: string, color: string, gameName?: string) {
  return { success: true, error: null };
}

export async function fixLeaguePermissions(leagueId?: string) {
  return { success: true, message: 'ok', error: null };
}

export async function getLeagueById(leagueId: string) {
  if (!leagueId) return { success: false, league: null, error: 'Missing league ID' };
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
  return { success: true, league, error: null };
}

export async function updateLeagueSettings(leagueId: string, settings: any) {
  try {
    await db.update(leagues)
      .set({
        name: settings.name,
        teamsLocked: settings.teamsLocked !== undefined ? (settings.teamsLocked ? 1 : 0) : undefined,
        joinLocked: settings.joinLocked !== undefined ? (settings.joinLocked ? 1 : 0) : undefined,
        isCompleted: settings.isCompleted
      })
      .where(eq(leagues.id, leagueId));
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- RACE & TRACK ACTIONS ---

export async function getLeagueRaces(leagueId: string) {
  const res = await db.select().from(races).where(eq(races.leagueId, leagueId));
  return { success: true, races: res, error: null };
}

export async function getRaceDetails(raceId: string) {
  const [race] = await db.select().from(races).where(eq(races.id, raceId));
  if (!race) return { success: false, error: 'Race not found', race: null, results: [] as any[], telemetrySessionId: null as string | null };
  const rawResults = await db.select({ result: raceResults, driver: drivers }).from(raceResults).innerJoin(drivers, eq(raceResults.driverId, drivers.id)).where(eq(raceResults.raceId, raceId));
  const results = rawResults.map((r: any) => ({ ...r.result, driverName: r.driver.name, driverColor: r.driver.color || '#fff' })).sort((a: any, b: any) => a.position - b.position);
  const [tSession] = await db.select().from(telemetrySessions).where(eq(telemetrySessions.raceId, raceId)).limit(1);
  return { success: true, race: { ...race, results }, results, telemetrySessionId: tSession?.id ?? null, error: null };
}

export async function deleteRace(raceId: string) {
  await db.delete(races).where(eq(races.id, raceId));
  return { success: true, error: null };
}

export async function scheduleRace(leagueId: string, raceData: { track: string; date: string; isRandom: boolean; revealHours: number }) {
  return { success: true, error: null };
}

export async function updateTrackPool(leagueId: string, trackIds: string[]) {
  try {
    await db.update(pointsConfig)
      .set({ trackPool: JSON.stringify(trackIds) })
      .where(eq(pointsConfig.leagueId, leagueId));
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- TEAM ACTIONS ---

export async function getLeagueTeams(leagueId: string) {
  const res = await db.select().from(teams).where(eq(teams.leagueId, leagueId));
  return { success: true, teams: res, error: null };
}

export async function addLeagueTeam(leagueId: string, teamName: string, color?: string) {
  return { success: true, error: null };
}

export async function updateLeagueTeam(leagueId: string, teamId: string, data: any, extra?: any) {
  return { success: true, error: null };
}

export async function deleteLeagueTeam(leagueId: string, teamId: string) {
  return { success: true, error: null };
}

// --- SCORING ACTIONS ---

export async function getPointsConfig(leagueId: string) {
  const [config] = await db.select().from(pointsConfig).where(eq(pointsConfig.leagueId, leagueId));
  if (config && typeof config.trackPool === 'string') {
    try {
      (config as any).trackPool = JSON.parse(config.trackPool || '[]');
    } catch (e) {
      (config as any).trackPool = [];
    }
  }
  return { success: true, config: config as any, error: null };
}

export async function updatePointsConfig(leagueId: string, config: any) {
  try {
    await db.update(pointsConfig)
      .set({
        pointsJson: JSON.stringify(config.points || []),
        qualiPointsJson: JSON.stringify(config.qualiPoints || {}),
        fastestLapBonus: config.fastestLapBonus,
        cleanDriverBonus: config.cleanDriverBonus,
        totalRaces: config.totalRaces,
        trackPool: JSON.stringify(config.trackPool || []),
        dropResultsCount: config.dropResultsCount,
        teamCompetition: config.teamCompetition
      })
      .where(eq(pointsConfig.leagueId, leagueId));
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- TELEMETRY ACTIONS ---

export async function getTelemetrySessionsForLeague(leagueId: string) {
  // Gibt Sessions zurück, die zu einem Rennen gehören (race_id IS NOT NULL)
  const res = await db.select().from(telemetrySessions)
    .where(and(eq(telemetrySessions.leagueId, leagueId), isNotNull(telemetrySessions.raceId)))
    .orderBy(desc(telemetrySessions.createdAt));
  return { success: true, sessions: res, error: null };
}

export async function deleteTelemetrySession(sessionId: string) {
  try {
    await db.delete(telemetrySessions).where(eq(telemetrySessions.id, sessionId));
    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Fehler beim Löschen der Session' };
  }
}

export async function getUnassignedTelemetrySessions(leagueId?: string) {
  if (!leagueId) return { success: true, sessions: [], error: null };
  
  // Gibt Sessions dieser Liga zurück, die KEINEM Rennen zugeordnet sind (race_id IS NULL)
  const res = await db.select().from(telemetrySessions)
    .where(and(eq(telemetrySessions.leagueId, leagueId), isNull(telemetrySessions.raceId)))
    .orderBy(desc(telemetrySessions.createdAt));
  
  return { success: true, sessions: res, error: null };
}

export async function getActiveTelemetrySession(leagueId: string) {
  const [session] = await db.select().from(telemetrySessions).where(and(eq(telemetrySessions.leagueId, leagueId), eq(telemetrySessions.isActive, true))).limit(1);
  if (!session) return { success: false, error: 'No active session', session: null, participants: [] as any[] };
  
  const participants = await db.select().from(telemetryParticipants).where(eq(telemetryParticipants.sessionId, session.id));
  
  return { success: true, session, participants, error: null };
}

export async function linkTelemetryToRace(sessionId: string, raceId: string) {
  try {
    await db.update(telemetrySessions)
      .set({ raceId: raceId })
      .where(eq(telemetrySessions.id, sessionId));
    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}export async function getTelemetrySessionDetails(leagueIdOrSessionId: string, maybeSessionId?: string) {
  const sessionId = maybeSessionId ?? leagueIdOrSessionId;
  const [session] = await db.select().from(telemetrySessions).where(eq(telemetrySessions.id, sessionId));
  if (!session) return { success: false, error: 'Session not found', session: null, details: null, participants: [] as any[] };
  const participants = await db.select().from(telemetryParticipants).where(eq(telemetryParticipants.sessionId, session.id));
  return { success: true, session, details: session, participants, error: null };
}

export async function assignTelemetryPlayer(leagueId: string, gameName: string, driverId: string) {
  return { success: true, error: null };
}

export async function getDashboardData(leagueIdOrSessionId: string, maybeLeagueId?: string) {
  const leagueId = maybeLeagueId ?? leagueIdOrSessionId;
  const sessionId = maybeLeagueId ? leagueIdOrSessionId : undefined;
  
  let league = null;
  if (leagueId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueId);
    const whereClause = isUuid 
      ? or(eq(leagues.id, leagueId), eq(leagues.name, leagueId))
      : eq(leagues.name, leagueId);
    const res = await db.select().from(leagues).where(whereClause).limit(1);
    league = res[0];
  }
  
  if (!league) return { success: false, error: 'League not found' };
  
  const actualLeagueId = league.id;
  const racesRes = await db.select().from(races).where(eq(races.leagueId, actualLeagueId));
  const upcomingRes = await db.select().from(races).where(and(eq(races.leagueId, actualLeagueId), eq(races.isFinished, false))).limit(3);
  
  const [configRow] = await db.select().from(pointsConfig).where(eq(pointsConfig.leagueId, actualLeagueId));
  const config = configRow ? {
    points: JSON.parse(configRow.pointsJson),
    qualiPoints: JSON.parse(configRow.qualiPointsJson || '{}'),
    fastestLapBonus: configRow.fastestLapBonus ?? 0,
    cleanDriverBonus: configRow.cleanDriverBonus ?? 0,
    totalRaces: configRow.totalRaces ?? 0,
    trackPool: JSON.parse(configRow.trackPool || '[]'),
    dropResultsCount: configRow.dropResultsCount ?? 0,
    teamCompetition: configRow.teamCompetition ?? false
  } : undefined;

  const allResults = await db.select({
    raceResults: raceResults,
    races: races
  }).from(raceResults)
    .innerJoin(races, eq(raceResults.raceId, races.id))
    .where(eq(races.leagueId, actualLeagueId));

  const standingsRes = await db.select({
    driver: drivers,
    team: teams
  }).from(drivers)
    .leftJoin(teams, eq(drivers.teamId, teams.id))
    .where(eq(drivers.leagueId, actualLeagueId));

  const standings = standingsRes.map((row: any) => {
    const driverId = row.driver.id;
    const driverResults = allResults.filter((r: any) => r.raceResults.driverId === driverId);
    
    let totalPoints = 0;
    let wins = 0;
    let podiums = 0;
    let fastestLaps = 0;

    driverResults.forEach((res: any) => {
        const p = res.raceResults.position;
        if (p === 1) wins++;
        if (p >= 1 && p <= 3) podiums++;
        if (res.raceResults.fastestLap) fastestLaps++;

        totalPoints += calculatePoints({
            position: res.raceResults.position,
            qualiPosition: res.raceResults.qualiPosition,
            fastestLap: res.raceResults.fastestLap,
            cleanDriver: res.raceResults.cleanDriver,
            isDnf: res.raceResults.isDnf
        }, config as any);
    });

    return {
      ...row.driver,
      total_points: totalPoints,
      wins,
      podiums,
      fastest_laps: fastestLaps,
      team: row.team?.name || row.driver.team || 'Independent'
    };
  }).sort((a: any, b: any) => b.total_points - a.total_points);
  
  const teamData = await db.select().from(teams).where(eq(teams.leagueId, actualLeagueId));
  const teamStandings = teamData.map((team: any) => {
    const teamDrivers = standings.filter((d: any) => d.teamId === team.id);
    const totalPoints = teamDrivers.reduce((sum: number, d: any) => sum + (d.total_points || 0), 0);
    const wins = teamDrivers.reduce((sum: number, d: any) => sum + (d.wins || 0), 0);
    return { ...team, total_points: totalPoints, wins };
  }).sort((a: any, b: any) => b.total_points - a.total_points);

  return { 
    success: true, 
    league, 
    standings, 
    teamStandings, 
    races: racesRes || [], 
    upcoming: upcomingRes || [],
    graphData: [],
    teamGraphData: [],
    stats: {
        totalRaces: racesRes.filter((r: any) => r.isFinished).length
    },
    error: null 
  };
}

export async function promoteTelemetryToRace(leagueId: string, sessionId: string, trackName: string) {
  return { success: true, error: null };
}

/**
 * Internal helper used by API routes and Workers.
 */
export async function internalPromoteTelemetryToRace(leagueId: string, sessionId: string, type: string) {
  return { success: true, error: null };
}

// --- ANALYTICS & RACE DATA ACTIONS ---

export async function getBestLapsPerSession(sessionId?: string) {
  return { success: true, laps: [] as any[], bestLaps: [] as any[], error: null };
}

export async function getLapSamples(lapId?: string) {
  return { success: true, samples: [] as any[], error: null };
}

export async function getBestLapForTrack(leagueIdOrTrackId?: string | number, maybeTrackId?: number | string) {
  return { success: true, lap: null as any, error: null };
}


export async function getDriverRaceTelemetry(sessionId: string, driverId: string) {
  return { success: true, telemetry: [] as any[], laps: [] as any[], error: null };
}

export async function getAllDriversRaceTelemetry(sessionId: string) {
  return { success: true, telemetry: [] as any[], drivers: [] as any[], laps: [] as any[], rawLaps: [] as any[], error: null };
}

export async function getDriverPositionHistory(sessionId: string, driverId: string) {
  const res = await db.select().from(telemetryParticipants).where(and(eq(telemetryParticipants.sessionId, sessionId), eq(telemetryParticipants.driverId, driverId)));
  return { success: true, history: res, positions: res as any[], error: null };
}

export async function getSessionSafetyCarEvents(sessionId: string) {
  const res = await db.select().from(telemetrySafetyCarEvents).where(eq(telemetrySafetyCarEvents.sessionId, sessionId));
  return { success: true, events: res, error: null };
}

export async function getSessionFastestSectors(sessionId: string, driverId?: string) {
  return { success: true, sectors: [], fastestSectors: null as any, error: null };
}

export async function getDriverIncidents(sessionId: string, driverId: string) {
  const res = await db.select().from(telemetryIncidents).where(eq(telemetryIncidents.sessionId, sessionId));
  return { success: true, incidents: res, error: null };
}

export async function getSessionLaps(sessionId: string) {
  const res = await db.select().from(telemetryLaps).innerJoin(telemetryParticipants, eq(telemetryLaps.participantId, telemetryParticipants.id)).where(and(eq(telemetryParticipants.sessionId, sessionId)));
  return { success: true, laps: res, error: null };
}

export async function getRaceAnalysis(raceId: string) {
  return { success: true, analysis: {}, error: null };
}

export async function getCarSetups(sessionId: string, driverId: string) {
  const res = await db.select().from(telemetryCarSetups).innerJoin(telemetryParticipants, eq(telemetryCarSetups.participantId, telemetryParticipants.id)).where(and(eq(telemetryParticipants.sessionId, sessionId), eq(telemetryParticipants.driverId, driverId)));
  return { success: true, setups: res, error: null };
}

export async function getSpeedTraps(sessionId: string) {
  const res = await db.select().from(telemetrySpeedTraps).where(eq(telemetrySpeedTraps.sessionId, sessionId));
  return { success: true, speedTraps: res, error: null };
}

export async function getPerformanceScores(sessionId: string) {
  return { success: true, scores: {}, error: null };
}

// --- RESULTS ACTIONS ---

export async function getRaceResults(raceId: string) {
  const [race] = await db.select().from(races).where(eq(races.id, raceId));
  const res = await db.select().from(raceResults).where(eq(raceResults.raceId, raceId));
  return { success: true, results: res, track: race?.track || null, error: null };
}

export async function saveRaceResults(leagueId: string, track: string, results: any, raceId?: string) {
  return { success: true, error: null };
}

export async function getAdminLeagueDrivers(leagueId: string) {
  const res = await db.select().from(drivers).where(eq(drivers.leagueId, leagueId));
  return { success: true, drivers: res, error: null };
}
