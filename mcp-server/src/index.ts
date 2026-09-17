import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from parent project
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '../../src/lib/db';
import { 
    leagues, 
    drivers, 
    teams, 
    races, 
    raceResults, 
    pointsConfig 
} from '../../src/lib/schema';
import { 
    calculatePoints, 
    DEFAULT_CONFIG, 
    DEFAULT_POINTS, 
    DEFAULT_QUALI_POINTS,
    PointsConfig 
} from '../../src/lib/scoring';
import { eq, and, desc, or } from 'drizzle-orm';

// Helper to resolve league by ID or Name
async function resolveLeague(idOrName: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName);
    const whereClause = isUuid ? or(eq(leagues.id, idOrName), eq(leagues.name, idOrName)) : eq(leagues.name, idOrName);
    const [league] = await db.select().from(leagues).where(whereClause).limit(1);
    return league || null;
}

// Helper to get PointsConfig
async function loadPointsConfig(leagueId: string): Promise<PointsConfig> {
    const [cfg] = await db.select().from(pointsConfig).where(eq(pointsConfig.leagueId, leagueId));
    if (!cfg) return DEFAULT_CONFIG;

    return {
        points: cfg.pointsJson ? JSON.parse(cfg.pointsJson) : DEFAULT_POINTS,
        qualiPoints: cfg.qualiPointsJson ? JSON.parse(cfg.qualiPointsJson) : DEFAULT_QUALI_POINTS,
        fastestLapBonus: cfg.fastestLapBonus ?? 1,
        cleanDriverBonus: cfg.cleanDriverBonus ?? 0,
        totalRaces: cfg.totalRaces ?? 0,
        trackPool: typeof cfg.trackPool === 'string' ? JSON.parse(cfg.trackPool || '[]') : (cfg.trackPool || []),
        dropResultsCount: cfg.dropResultsCount ?? 0,
        teamCompetition: !!cfg.teamCompetition
    };
}

// Initialize MCP Server
const server = new McpServer({
    name: 'f1app-mcp-server',
    version: '1.0.0'
});

// 1. TOOL: f1_list_leagues
server.tool(
    'f1_list_leagues',
    'List all existing F1 leagues with their ID, name, number of races, and completion status.',
    {
        includeCompleted: z.boolean().optional().describe('Whether to include completed leagues. Defaults to true.')
    },
    async ({ includeCompleted = true }) => {
        try {
            const allLeagues = await db.select().from(leagues).orderBy(desc(leagues.createdAt));
            const filtered = includeCompleted ? allLeagues : allLeagues.filter(l => !l.isCompleted);

            const result = await Promise.all(filtered.map(async (l) => {
                const raceList = await db.select().from(races).where(eq(races.leagueId, l.id));
                const driverList = await db.select().from(drivers).where(eq(drivers.leagueId, l.id));
                return {
                    id: l.id,
                    name: l.name,
                    isCompleted: l.isCompleted,
                    createdAt: l.createdAt,
                    raceCount: raceList.length,
                    finishedRaceCount: raceList.filter(r => r.isFinished).length,
                    driverCount: driverList.length
                };
            }));

            return {
                content: [{ type: 'text', text: JSON.stringify({ success: true, leagues: result }, null, 2) }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 2. TOOL: f1_get_league
server.tool(
    'f1_get_league',
    'Get full details of a specific league, including drivers, teams, races, and points configuration.',
    {
        leagueIdOrName: z.string().describe('League UUID or unique League name')
    },
    async ({ leagueIdOrName }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            const [driverList, teamList, raceList, config] = await Promise.all([
                db.select().from(drivers).where(eq(drivers.leagueId, league.id)),
                db.select().from(teams).where(eq(teams.leagueId, league.id)),
                db.select().from(races).where(eq(races.leagueId, league.id)),
                loadPointsConfig(league.id)
            ]);

            return {
                content: [{ 
                    type: 'text', 
                    text: JSON.stringify({
                        success: true,
                        league,
                        config,
                        drivers: driverList,
                        teams: teamList,
                        races: raceList
                    }, null, 2) 
                }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 3. TOOL: f1_create_league
server.tool(
    'f1_create_league',
    'Create a new F1 league with an optional custom points system.',
    {
        name: z.string().describe('Unique name of the league (e.g. "Season 3")'),
        fastestLapBonus: z.number().optional().describe('Bonus points for fastest lap (default: 1)'),
        points: z.record(z.string(), z.number()).optional().describe('Custom points map, e.g. {"1": 25, "2": 18, ...}')
    },
    async ({ name, fastestLapBonus = 1, points }) => {
        try {
            const [newLeague] = await db.insert(leagues).values({ name }).returning();

            const parsedPoints = points 
                ? Object.fromEntries(Object.entries(points).map(([k, v]) => [Number(k), v]))
                : DEFAULT_POINTS;

            await db.insert(pointsConfig).values({
                leagueId: newLeague.id,
                pointsJson: JSON.stringify(parsedPoints),
                qualiPointsJson: JSON.stringify(DEFAULT_QUALI_POINTS),
                fastestLapBonus,
                cleanDriverBonus: 0,
                totalRaces: 0,
                trackPool: '[]'
            });

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `League "${name}" created successfully.`,
                        league: newLeague
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 4. TOOL: f1_manage_drivers
server.tool(
    'f1_manage_drivers',
    'Add, update, delete, or list drivers in a specific league.',
    {
        leagueIdOrName: z.string().describe('League UUID or name'),
        action: z.enum(['list', 'add', 'update', 'delete']).describe('Operation to perform on drivers'),
        driverId: z.string().optional().describe('Driver UUID (required for update/delete)'),
        name: z.string().optional().describe('Driver display name'),
        team: z.string().optional().describe('Team name (e.g. "Ferrari", "McLaren", "Mercedes")'),
        color: z.string().optional().describe('Hex color code (e.g. "#E8002D")'),
        gameName: z.string().optional().describe('In-game Gamertag / Telemetry Name')
    },
    async ({ leagueIdOrName, action, driverId, name, team, color, gameName }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            if (action === 'list') {
                const driverList = await db.select().from(drivers).where(eq(drivers.leagueId, league.id));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, drivers: driverList }, null, 2) }]
                };
            }

            if (action === 'add') {
                if (!name) throw new Error('Driver name is required for "add" action.');

                let teamId: string | undefined;
                if (team) {
                    const [foundTeam] = await db.select().from(teams).where(and(eq(teams.leagueId, league.id), eq(teams.name, team)));
                    if (foundTeam) teamId = foundTeam.id;
                }

                const [newDriver] = await db.insert(drivers).values({
                    leagueId: league.id,
                    name,
                    team: team || null,
                    teamId: teamId as any,
                    color: color || '#ffffff',
                    gameName: gameName || name
                }).returning();

                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, driver: newDriver }, null, 2) }]
                };
            }

            if (action === 'update') {
                if (!driverId) throw new Error('Driver ID is required for "update" action.');

                let teamId: string | undefined;
                if (team) {
                    const [foundTeam] = await db.select().from(teams).where(and(eq(teams.leagueId, league.id), eq(teams.name, team)));
                    if (foundTeam) teamId = foundTeam.id;
                }

                const [updated] = await db.update(drivers).set({
                    ...(name ? { name } : {}),
                    ...(team !== undefined ? { team, teamId: teamId as any } : {}),
                    ...(color ? { color } : {}),
                    ...(gameName !== undefined ? { gameName } : {})
                }).where(eq(drivers.id, driverId)).returning();

                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, driver: updated }, null, 2) }]
                };
            }

            if (action === 'delete') {
                if (!driverId) throw new Error('Driver ID is required for "delete" action.');
                await db.delete(drivers).where(eq(drivers.id, driverId));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Driver ${driverId} deleted.` }) }]
                };
            }

            throw new Error(`Unsupported action "${action}"`);
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 5. TOOL: f1_manage_teams
server.tool(
    'f1_manage_teams',
    'Add, update, delete, or list constructor teams in a league.',
    {
        leagueIdOrName: z.string().describe('League UUID or name'),
        action: z.enum(['list', 'add', 'update', 'delete']).describe('Operation to perform on teams'),
        teamId: z.string().optional().describe('Team UUID (required for update/delete)'),
        name: z.string().optional().describe('Team name (e.g. "McLaren", "Ferrari")'),
        color: z.string().optional().describe('Hex color for team')
    },
    async ({ leagueIdOrName, action, teamId, name, color }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            if (action === 'list') {
                const teamList = await db.select().from(teams).where(eq(teams.leagueId, league.id));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, teams: teamList }, null, 2) }]
                };
            }

            if (action === 'add') {
                if (!name) throw new Error('Team name is required for "add" action.');
                const [newTeam] = await db.insert(teams).values({
                    leagueId: league.id,
                    name,
                    color: color || '#ffffff'
                }).returning();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, team: newTeam }, null, 2) }]
                };
            }

            if (action === 'update') {
                if (!teamId) throw new Error('Team ID is required for "update" action.');
                const [updated] = await db.update(teams).set({
                    ...(name ? { name } : {}),
                    ...(color ? { color } : {})
                }).where(eq(teams.id, teamId)).returning();
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, team: updated }, null, 2) }]
                };
            }

            if (action === 'delete') {
                if (!teamId) throw new Error('Team ID is required for "delete" action.');
                await db.delete(teams).where(eq(teams.id, teamId));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Team ${teamId} deleted.` }) }]
                };
            }

            throw new Error(`Unsupported action "${action}"`);
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 6. TOOL: f1_schedule_race
server.tool(
    'f1_schedule_race',
    'Schedule a race in a league calendar.',
    {
        leagueIdOrName: z.string().describe('League UUID or name'),
        track: z.string().describe('Track name (e.g. "Spa", "Silverstone", "Austria")'),
        date: z.string().optional().describe('ISO date or datetime string for the race'),
        isRandom: z.boolean().optional().describe('Whether track was randomly drawn')
    },
    async ({ leagueIdOrName, track, date, isRandom = false }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            const [newRace] = await db.insert(races).values({
                leagueId: league.id,
                track,
                scheduledDate: date ? new Date(date) : new Date(),
                isRandom,
                isFinished: false
            }).returning();

            return {
                content: [{ type: 'text', text: JSON.stringify({ success: true, race: newRace }, null, 2) }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 7. TOOL: f1_record_race_results
server.tool(
    'f1_record_race_results',
    'Record race results for a track and calculate points automatically according to the league points config.',
    {
        leagueIdOrName: z.string().describe('League UUID or name'),
        track: z.string().describe('Track name (e.g. "Spa", "Silverstone", "Austria")'),
        raceId: z.string().optional().describe('Optional existing Race UUID'),
        raceDate: z.string().optional().describe('Date when the race was run'),
        results: z.array(z.object({
            driverIdOrName: z.string().describe('Driver UUID or exact driver name'),
            position: z.number().int().min(1).describe('Finish position (1 for P1, 2 for P2, etc.)'),
            qualiPosition: z.number().int().optional().default(0).describe('Starting/Qualification position'),
            fastestLap: z.boolean().optional().default(false).describe('Whether driver scored the fastest lap'),
            cleanDriver: z.boolean().optional().default(false).describe('Clean driver award'),
            isDnf: z.boolean().optional().default(false).describe('Did not finish (DNF)'),
            penaltiesTime: z.number().int().optional().default(0).describe('Time penalties in seconds')
        })).describe('Array of classified driver finishes')
    },
    async ({ leagueIdOrName, track, raceId, raceDate, results }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            const config = await loadPointsConfig(league.id);
            const leagueDrivers = await db.select().from(drivers).where(eq(drivers.leagueId, league.id));

            // Determine target race
            let targetRaceId = raceId;
            if (!targetRaceId) {
                const [existing] = await db.select().from(races).where(
                    and(eq(races.leagueId, league.id), eq(races.track, track))
                ).limit(1);

                if (existing) {
                    targetRaceId = existing.id;
                    await db.update(races).set({ 
                        isFinished: true, 
                        raceDate: raceDate ? new Date(raceDate) : new Date() 
                    }).where(eq(races.id, targetRaceId));
                } else {
                    const [created] = await db.insert(races).values({
                        leagueId: league.id,
                        track,
                        isFinished: true,
                        raceDate: raceDate ? new Date(raceDate) : new Date()
                    }).returning();
                    targetRaceId = created.id;
                }
            } else {
                await db.update(races).set({ 
                    isFinished: true, 
                    track, 
                    raceDate: raceDate ? new Date(raceDate) : new Date() 
                }).where(eq(races.id, targetRaceId));
            }

            // Remove existing results for this race
            await db.delete(raceResults).where(eq(raceResults.raceId, targetRaceId));

            // Map and calculate results
            const insertedResults = [];
            for (const r of results) {
                const driver = leagueDrivers.find(d => 
                    d.id === r.driverIdOrName || 
                    d.name.toLowerCase() === r.driverIdOrName.toLowerCase() ||
                    (d.gameName && d.gameName.toLowerCase() === r.driverIdOrName.toLowerCase())
                );

                if (!driver) {
                    throw new Error(`Driver "${r.driverIdOrName}" not found in league "${league.name}".`);
                }

                const points = calculatePoints({
                    position: r.position,
                    qualiPosition: r.qualiPosition,
                    fastestLap: r.fastestLap,
                    cleanDriver: r.cleanDriver,
                    isDnf: r.isDnf
                }, config);

                const [inserted] = await db.insert(raceResults).values({
                    raceId: targetRaceId,
                    driverId: driver.id,
                    position: r.position,
                    qualiPosition: r.qualiPosition,
                    fastestLap: r.fastestLap,
                    cleanDriver: r.cleanDriver,
                    isDnf: r.isDnf,
                    penaltiesTime: r.penaltiesTime,
                    pointsEarned: points
                }).returning();

                insertedResults.push({
                    ...inserted,
                    driverName: driver.name,
                    pointsEarned: points
                });
            }

            // Recalculate driver totals
            for (const d of leagueDrivers) {
                const allDriverResults = await db.select().from(raceResults).where(eq(raceResults.driverId, d.id));
                const total = allDriverResults.reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0);
                await db.update(drivers).set({ totalPoints: total, rawPoints: total }).where(eq(drivers.id, d.id));
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Recorded ${insertedResults.length} results for race "${track}".`,
                        raceId: targetRaceId,
                        results: insertedResults
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 8. TOOL: f1_get_standings
server.tool(
    'f1_get_standings',
    'Calculate and retrieve current driver and constructor championship standings with points, wins, and podiums.',
    {
        leagueIdOrName: z.string().describe('League UUID or name')
    },
    async ({ leagueIdOrName }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            const [driverList, teamList, raceList] = await Promise.all([
                db.select().from(drivers).where(eq(drivers.leagueId, league.id)),
                db.select().from(teams).where(eq(teams.leagueId, league.id)),
                db.select().from(races).where(eq(races.leagueId, league.id))
            ]);

            const finishedRaces = raceList.filter(r => r.isFinished);
            const raceIds = finishedRaces.map(r => r.id);

            const allResults = raceIds.length > 0 
                ? await db.select().from(raceResults)
                : [];

            const driverStandings = driverList.map(driver => {
                const dResults = allResults.filter(r => r.driverId === driver.id && raceIds.includes(r.raceId!));
                const totalPoints = dResults.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
                const wins = dResults.filter(r => r.position === 1 && !r.isDnf).length;
                const podiums = dResults.filter(r => r.position >= 1 && r.position <= 3 && !r.isDnf).length;
                const fastestLaps = dResults.filter(r => r.fastestLap).length;
                const team = teamList.find(t => t.id === driver.teamId);

                return {
                    id: driver.id,
                    name: driver.name,
                    team: team?.name || driver.team || 'Independent',
                    teamColor: team?.color || driver.color,
                    points: totalPoints,
                    wins,
                    podiums,
                    fastestLaps,
                    racesCount: dResults.length
                };
            }).sort((a, b) => b.points - a.points || b.wins - a.wins);

            const teamStandings = teamList.map(team => {
                const teamDrivers = driverStandings.filter(d => {
                    const drv = driverList.find(x => x.id === d.id);
                    return drv?.teamId === team.id;
                });
                const totalPoints = teamDrivers.reduce((sum, d) => sum + d.points, 0);
                const wins = teamDrivers.reduce((sum, d) => sum + d.wins, 0);

                return {
                    id: team.id,
                    name: team.name,
                    color: team.color,
                    points: totalPoints,
                    wins,
                    driverCount: teamDrivers.length
                };
            }).sort((a, b) => b.points - a.points || b.wins - a.wins);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        leagueName: league.name,
                        racesCompleted: finishedRaces.length,
                        driverStandings,
                        teamStandings
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// 9. TOOL: f1_recalculate_points
server.tool(
    'f1_recalculate_points',
    'Recalculate all driver and constructor points for all completed races in a league.',
    {
        leagueIdOrName: z.string().describe('League UUID or name')
    },
    async ({ leagueIdOrName }) => {
        try {
            const league = await resolveLeague(leagueIdOrName);
            if (!league) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `League "${leagueIdOrName}" not found.` }) }]
                };
            }

            const config = await loadPointsConfig(league.id);
            const [driverList, raceList] = await Promise.all([
                db.select().from(drivers).where(eq(drivers.leagueId, league.id)),
                db.select().from(races).where(eq(races.leagueId, league.id))
            ]);

            const finishedRaces = raceList.filter(r => r.isFinished);
            let updatedCount = 0;

            for (const race of finishedRaces) {
                const results = await db.select().from(raceResults).where(eq(raceResults.raceId, race.id));
                for (const r of results) {
                    const pts = calculatePoints({
                        position: r.position,
                        qualiPosition: r.qualiPosition ?? undefined,
                        fastestLap: !!r.fastestLap,
                        cleanDriver: !!r.cleanDriver,
                        isDnf: !!r.isDnf
                    }, config);

                    if (pts !== r.pointsEarned) {
                        await db.update(raceResults).set({ pointsEarned: pts }).where(eq(raceResults.id, r.id));
                        updatedCount++;
                    }
                }
            }

            // Update driver total points
            for (const d of driverList) {
                const allDriverResults = await db.select().from(raceResults).where(eq(raceResults.driverId, d.id));
                const total = allDriverResults.reduce((acc, curr) => acc + (curr.pointsEarned || 0), 0);
                await db.update(drivers).set({ totalPoints: total, rawPoints: total }).where(eq(drivers.id, d.id));
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Points recalculated for "${league.name}". ${updatedCount} race results updated.`,
                        leagueId: league.id
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }) }]
            };
        }
    }
);

// Connect stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('F1App MCP Server running on stdio');
}

main().catch(err => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
});
