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
import { calculatePoints, DEFAULT_POINTS, DEFAULT_QUALI_POINTS } from '@/lib/scoring';

import { eq, or, and, desc, isNull, isNotNull, inArray } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { telemetryService } from '@/lib/telemetry/telemetry-service';
import bcrypt from 'bcryptjs';

// --- AUTH & USER ACTIONS ---

export async function updateUserPassword(oldPassword: string, newPassword: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'NOT_AUTHENTICATED' };
    const userId = (session.user as any).id;

    // Get current user to check old password
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return { success: false, error: 'USER_NOT_FOUND' };

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash || '');
    if (!isMatch) return { success: false, error: 'Das aktuelle Passwort ist nicht korrekt.' };

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('updateUserPassword error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateUserEmail(newEmail: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'NOT_AUTHENTICATED' };
    const userId = (session.user as any).id;

    // Check if email already taken
    const [existing] = await db.select().from(users).where(eq(users.email, newEmail));
    if (existing && existing.id !== userId) {
      return { success: false, error: 'Diese E-Mail-Adresse wird bereits verwendet.' };
    }

    await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('updateUserEmail error:', err);
    return { success: false, error: err.message };
  }
}

export async function getUserLeagues() {
  const session = await auth();
  if (!session?.user) return { success: false, leagues: [], error: 'Not authenticated' };
  const userId = (session.user as any).id;

  // Find leagues where user is owner OR a driver
  const owned = await db.select().from(leagues).where(eq(leagues.ownerId, userId));
  
  // Also find leagues where they are a driver
  const driverEntries = await db.select().from(drivers).where(eq(drivers.userId, userId));
  const driverLeagueIds = driverEntries.map(d => d.leagueId).filter(id => id !== null) as string[];
  
  let driverLeagues: any[] = [];
  if (driverLeagueIds.length > 0) {
    driverLeagues = await db.select().from(leagues).where(inArray(leagues.id, driverLeagueIds));
  }

  // Combine and deduplicate
  const allLeagues = [...owned];
  for (const dl of driverLeagues) {
    if (!allLeagues.find(l => l.id === dl.id)) {
      allLeagues.push(dl);
    }
  }

  return { success: true, leagues: allLeagues, error: null };
}

export async function deleteLeague(leagueId: string) {
  try {
    await ensureAdmin(leagueId);
    await db.delete(leagues).where(eq(leagues.id, leagueId));
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

/**
 * Helper to ensure the current user is the admin of a league.
 */
async function ensureAdmin(leagueId: string) {
  const session = await auth();
  if (!session?.user) throw new Error('NOT_AUTHENTICATED');
  
  const userId = (session.user as any).id;
  const [league] = await db.select().from(leagues).where(and(eq(leagues.id, leagueId), eq(leagues.ownerId, userId)));
  
  if (!league) throw new Error('NOT_AUTHORIZED');
  return league;
}

export async function getAdminLeagues() {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated', leagues: [] };
  
  const userId = (session.user as any).id;
  if (!userId) return { success: false, error: 'User ID missing', leagues: [] };

  const res = await db.select().from(leagues).where(eq(leagues.ownerId, userId));
  return { success: true, leagues: res, error: null };
}

export async function getPublicLeagueRaces(leagueId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueId);
  if (!isUuid) return { success: false, races: [], error: 'Invalid ID' };

  const res = await db.select().from(races).where(eq(races.leagueId, leagueId));
  return { success: true, races: res, error: null };
}

export async function createLeague(name: string, ownerId?: string) {
  await db.insert(leagues).values({ name, ownerId });
  return { success: true, error: null };
}

export async function joinLeagueById(leagueId: string, driverName: string, teamName: string, color: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Not authenticated' };
    const userId = (session.user as any).id;

    // Check if league exists
    const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId));
    if (!league) return { success: false, error: 'League not found' };

    // Check if already a driver
    const [existing] = await db.select().from(drivers).where(and(eq(drivers.leagueId, leagueId), eq(drivers.userId, userId)));
    if (existing) return { success: false, error: 'You are already a driver in this league' };

    // Optional: find teamId if teamName is provided
    let teamId: string | undefined;
    if (teamName) {
      const [team] = await db.select().from(teams).where(and(eq(teams.leagueId, leagueId), eq(teams.name, teamName)));
      if (team) teamId = team.id;
    }

    await db.insert(drivers).values({
      leagueId,
      userId,
      name: driverName,
      team: teamName,
      teamId: teamId as any,
      color: color || '#ffffff'
    });

    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err: any) {
    console.error('joinLeagueById error:', err);
    return { success: false, error: err.message };
  }
}

export async function joinLeague(leagueName: string, driverName: string, teamName: string, color: string, gameName?: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'Not authenticated' };
    const userId = (session.user as any).id;

    // Find league by name
    const [league] = await db.select().from(leagues).where(eq(leagues.name, leagueName));
    if (!league) return { success: false, error: 'League not found' };

    // Check if already a driver
    const [existing] = await db.select().from(drivers).where(and(eq(drivers.leagueId, league.id), eq(drivers.userId, userId)));
    if (existing) return { success: false, error: 'You are already a driver in this league' };

    // Optional: find teamId if teamName is provided
    let teamId: string | undefined;
    if (teamName) {
      const [team] = await db.select().from(teams).where(and(eq(teams.leagueId, league.id), eq(teams.name, teamName)));
      if (team) teamId = team.id;
    }

    await db.insert(drivers).values({
      leagueId: league.id,
      userId,
      name: driverName,
      team: teamName,
      teamId: teamId as any,
      gameName: gameName || null,
      color: color || '#ffffff'
    });

    revalidatePath('/', 'layout');
    return { success: true, error: null };
  } catch (err: any) {
    console.error('joinLeague error:', err);
    return { success: false, error: err.message };
  }
}

export async function fixLeaguePermissions(leagueId?: string) {
  return { success: true, message: 'ok', error: null };
}

export async function getLeagueById(leagueId: string) {
  if (!leagueId) return { success: false, league: null, error: 'Missing league ID' };
  
  // Check if leagueId is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueId);
  if (!isUuid) return { success: false, league: null, error: 'Ungültiges Liga-ID Format. Bitte nutze den Link aus dem Dashboard.' };

  try {
    const league = await ensureAdmin(leagueId);
    return { success: true, league, error: null };
  } catch (err: any) {
    return { success: false, league: null, error: err.message === 'NOT_AUTHORIZED' ? 'Zugriff verweigert: Du bist nicht der Admin dieser Liga.' : err.message };
  }
}

export async function updateLeagueSettings(leagueId: string, settings: any) {
  try {
    await ensureAdmin(leagueId);
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
  try {
    const [race] = await db.select().from(races).where(eq(races.id, raceId));
    if (!race || !race.leagueId) return { success: false, error: 'Race not found' };
    
    await ensureAdmin(race.leagueId);
    
    await db.delete(races).where(eq(races.id, raceId));
    
    revalidatePath(`/profile/leagues/${race.leagueId}/races`);
    revalidatePath(`/profile/leagues/${race.leagueId}`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/`);
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('deleteRace error:', err);
    return { success: false, error: err.message };
  }
}

export async function scheduleRace(leagueId: string, raceData: { track: string; date: string; isRandom: boolean; revealHours: number }) {
  try {
    await ensureAdmin(leagueId);
    
    await db.insert(races).values({
      leagueId,
      track: raceData.isRandom ? 'RANDOM' : raceData.track,
      scheduledDate: new Date(raceData.date),
      isRandom: raceData.isRandom,
      isHidden: raceData.isRandom,
      revealHoursBefore: raceData.revealHours,
      isFinished: false,
    });
    
    revalidatePath(`/profile/leagues/${leagueId}/races`);
    revalidatePath(`/profile/leagues/${leagueId}`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/`);
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('scheduleRace error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateTrackPool(leagueId: string, trackIds: string[]) {
  try {
    await ensureAdmin(leagueId);
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
  try {
    await ensureAdmin(leagueId);
    await db.insert(teams).values({
      leagueId,
      name: teamName,
      color: color || '#ffffff'
    });
    revalidatePath(`/profile/leagues/${leagueId}/teams`);
    revalidatePath(`/profile/leagues/${leagueId}`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('addLeagueTeam error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateLeagueTeam(leagueId: string, teamId: string, name: string, color: string) {
  try {
    await ensureAdmin(leagueId);
    await db.update(teams)
      .set({ name, color })
      .where(eq(teams.id, teamId));
    revalidatePath(`/profile/leagues/${leagueId}/teams`);
    revalidatePath(`/profile/leagues/${leagueId}`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('updateLeagueTeam error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteLeagueTeam(leagueId: string, teamId: string) {
  try {
    await ensureAdmin(leagueId);
    await db.delete(teams).where(eq(teams.id, teamId));
    revalidatePath(`/profile/leagues/${leagueId}/teams`);
    revalidatePath(`/profile/leagues/${leagueId}`);
    return { success: true, error: null };
  } catch (err: any) {
    console.error('deleteLeagueTeam error:', err);
    return { success: false, error: err.message };
  }
}

// --- SCORING ACTIONS ---

export async function getPointsConfig(leagueId: string) {
  try {
    const [config] = await db.select().from(pointsConfig).where(eq(pointsConfig.leagueId, leagueId));
    
    if (!config) {
      return { 
        success: true, 
        config: {
          leagueId,
          points: DEFAULT_POINTS,
          qualiPoints: DEFAULT_QUALI_POINTS,
          fastestLapBonus: 1,
          cleanDriverBonus: 0,
          totalRaces: 0,
          trackPool: [],
          dropResultsCount: 0,
          teamCompetition: false
        } as any, 
        error: null 
      };
    }

    const parsedConfig = {
      ...config,
      points: config.pointsJson ? JSON.parse(config.pointsJson) : DEFAULT_POINTS,
      qualiPoints: config.qualiPointsJson ? JSON.parse(config.qualiPointsJson) : DEFAULT_QUALI_POINTS,
      trackPool: typeof config.trackPool === 'string' ? JSON.parse(config.trackPool || '[]') : (config.trackPool || [])
    };

    return { success: true, config: parsedConfig as any, error: null };
  } catch (err: any) {
    console.error('getPointsConfig error:', err);
    return { success: false, config: null, error: err.message };
  }
}


export async function updatePointsConfig(leagueId: string, config: any) {
  try {
    await ensureAdmin(leagueId);
    
    // Check if config exists
    const [existing] = await db.select().from(pointsConfig).where(eq(pointsConfig.leagueId, leagueId));
    
    const values = {
      pointsJson: JSON.stringify(config.points || DEFAULT_POINTS),
      qualiPointsJson: JSON.stringify(config.qualiPoints || DEFAULT_QUALI_POINTS),
      fastestLapBonus: config.fastestLapBonus,
      cleanDriverBonus: config.cleanDriverBonus,
      totalRaces: config.totalRaces,
      trackPool: JSON.stringify(config.trackPool || []),
      dropResultsCount: config.dropResultsCount,
      teamCompetition: config.teamCompetition
    };

    if (existing) {
      await db.update(pointsConfig).set(values).where(eq(pointsConfig.leagueId, leagueId));
    } else {
      await db.insert(pointsConfig).values({ leagueId, ...values });
    }
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('updatePointsConfig error:', err);
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
  try {
    await ensureAdmin(leagueId);
    
    await db.update(drivers)
      .set({ gameName: gameName || null })
      .where(and(eq(drivers.id, driverId), eq(drivers.leagueId, leagueId)));
    
    revalidatePath(`/profile/leagues/${leagueId}/telemetry`);
    
    return { success: true, error: null };
  } catch (err: any) {
    console.error('assignTelemetryPlayer error:', err);
    return { success: false, error: err.message };
  }
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
  
  const configRes = await getPointsConfig(actualLeagueId);
  const config = configRes.success ? configRes.config : undefined;

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
      totalPoints: totalPoints,
      wins,
      podiums,
      fastestLaps: fastestLaps,
      team: row.team?.name || row.driver.team || 'Independent'
    };
  }).sort((a: any, b: any) => b.totalPoints - a.totalPoints);
  
  const teamData = await db.select().from(teams).where(eq(teams.leagueId, actualLeagueId));
  const teamStandings = teamData.map((team: any) => {
    const teamDrivers = standings.filter((d: any) => d.teamId === team.id);
    const totalPoints = teamDrivers.reduce((sum: number, d: any) => sum + (d.totalPoints || 0), 0);
    const wins = teamDrivers.reduce((sum: number, d: any) => sum + (d.wins || 0), 0);
    return { ...team, totalPoints: totalPoints, wins };
  }).sort((a: any, b: any) => b.totalPoints - a.totalPoints);

  return { 
    success: true, 
    league: { ...league, config }, 
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
  return { success: true, results: res, track: race?.track || null, raceDate: race?.raceDate || null, error: null };
}

export async function saveRaceResults(leagueId: string, track: string, results: any[], raceId?: string, raceDate?: string) {
  try {
    await ensureAdmin(leagueId);

    // Get points config
    const configRes = await getPointsConfig(leagueId);
    if (!configRes.success) throw new Error(configRes.error || 'Failed to load points config');
    
    const config = configRes.config;

    let targetRaceId = raceId;

    if (!targetRaceId) {
      // Find or create race
      const [existingRace] = await db.select().from(races).where(
        and(
          eq(races.leagueId, leagueId), 
          eq(races.track, track), 
          eq(races.isFinished, false)
        )
      ).limit(1);
      
      if (existingRace) {
        targetRaceId = existingRace.id;
      } else {
        const [newRace] = await db.insert(races).values({
          leagueId,
          track,
          isFinished: true,
          raceDate: raceDate ? new Date(raceDate) : new Date()
        }).returning({ id: races.id });
        targetRaceId = newRace.id;
      }
    } else {
      // Update existing race
      await db.update(races).set({ 
        isFinished: true, 
        track,
        raceDate: raceDate ? new Date(raceDate) : new Date() 
      }).where(eq(races.id, targetRaceId));
    }

    // Delete existing results for this race
    await db.delete(raceResults).where(eq(raceResults.raceId, targetRaceId));

    // Prepare and insert results
    const resultsToInsert = results.map(r => {
      const points = calculatePoints({
        position: r.position,
        qualiPosition: r.quali_position,
        fastestLap: r.fastest_lap,
        cleanDriver: r.clean_driver,
        isDnf: r.is_dnf
      }, config as any);

      return {
        raceId: targetRaceId,
        driverId: r.driver_id,
        position: r.position,
        qualiPosition: r.quali_position,
        fastestLap: r.fastest_lap,
        cleanDriver: r.clean_driver,
        isDnf: r.is_dnf,
        pointsEarned: points
      };
    });

    if (resultsToInsert.length > 0) {
      await db.insert(raceResults).values(resultsToInsert);
    }

    revalidatePath(`/profile/leagues/${leagueId}`);
    revalidatePath(`/profile/leagues/${leagueId}/results`);
    revalidatePath(`/dashboard`);
    revalidatePath(`/`);

    return { success: true, error: null };
  } catch (err: any) {
    console.error('saveRaceResults error:', err);
    return { success: false, error: err.message };
  }
}



export async function getAdminLeagueDrivers(leagueId: string) {
  try {
    // Check if leagueId is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueId);
    if (!isUuid) return { success: false, drivers: [], error: 'Invalid League ID format' };

    await ensureAdmin(leagueId);
    
    // Join with users to get avatarUrl
    const res = await db.select({
      id: drivers.id,
      name: drivers.name,
      team: drivers.team,
      color: drivers.color,
      avatarUrl: users.avatarUrl,
    })
    .from(drivers)
    .leftJoin(users, eq(drivers.userId, users.id))
    .where(eq(drivers.leagueId, leagueId));

    return { success: true, drivers: res, error: null };
  } catch (err: any) {
    console.error('getAdminLeagueDrivers error:', err);
    return { success: false, drivers: [], error: err.message };
  }
}
