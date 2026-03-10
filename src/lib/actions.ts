'use server';

import crypto from 'crypto';
import { query, run } from './db';
import { calculatePoints, DEFAULT_CONFIG, PointsConfig } from './scoring';

/**
 * Creates a new league.
 */
export async function createLeague(name: string, adminPass: string, joinPass: string) {
    try {
        const leagueId = crypto.randomUUID();
        await run(
            `INSERT INTO leagues (id, name, admin_password, join_password) VALUES (?, ?, ?, ?)`,
            [leagueId, name, adminPass, joinPass]
        );

        // Initialize default points config
        await run(
            `INSERT INTO points_config (league_id, points_json, quali_points_json, fastest_lap_bonus, clean_driver_bonus, total_races, track_pool, drop_results_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [leagueId, JSON.stringify(DEFAULT_CONFIG.points), JSON.stringify(DEFAULT_CONFIG.qualiPoints), DEFAULT_CONFIG.fastestLapBonus, DEFAULT_CONFIG.cleanDriverBonus, DEFAULT_CONFIG.totalRaces, JSON.stringify(DEFAULT_CONFIG.trackPool), DEFAULT_CONFIG.dropResultsCount]
        );

        console.log(`League created: ${name}`);
        return { success: true, leagueId };
    } catch (error: any) {
        console.error('Create League Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validates a league for joining and creates a driver.
 */
export async function joinLeague(leagueName: string, joinPass: string, driverName: string, team: string, color: string, gameName?: string) {
    try {
        const leagues = await query<any>(
            `SELECT id, join_password FROM leagues WHERE name = ?`,
            [leagueName]
        );

        if (leagues.length === 0) throw new Error('League not found.');
        if (leagues[0].join_password !== joinPass) throw new Error('Incorrect Join Password.');

        const leagueId = leagues[0].id;
        const driverId = crypto.randomUUID();

        await run(
            `INSERT INTO drivers (id, league_id, name, team, color, game_name) VALUES (?, ?, ?, ?, ?, ?)`,
            [driverId, leagueId, driverName, team, color || '#ffffff', gameName || null]
        );

        return { success: true };
    } catch (error: any) {
        console.error('Join League Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validates admin credentials and fetches drivers.
 */
export async function adminLogin(leagueName: string, adminPass: string) {
    try {
        const leagues = await query<any>(
            `SELECT id, admin_password FROM leagues WHERE name = ?`,
            [leagueName]
        );

        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Invalid League Name or Admin Password.');
        }

        const drivers = await query<any>(
            `SELECT id, name, team, color, game_name FROM drivers WHERE league_id = ?`,
            [leagues[0].id]
        );

        return { success: true, leagueId: leagues[0].id, drivers };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Adds a driver to a league as an admin (bypasses join password).
 */
export async function adminAddDriver(leagueId: string, adminPass: string, driverName: string, team: string, color: string, gameName?: string) {
    try {
        const leagues = await query<any>(
            `SELECT id FROM leagues WHERE id = ? AND admin_password = ?`,
            [leagueId, adminPass]
        );

        if (leagues.length === 0) throw new Error('Invalid Admin Credentials.');

        const driverId = crypto.randomUUID();

        await run(
            `INSERT INTO drivers (id, league_id, name, team, color, game_name) VALUES (?, ?, ?, ?, ?, ?)`,
            [driverId, leagueId, driverName, team, color || '#ffffff', gameName || null]
        );

        return { success: true };
    } catch (error: any) {
        console.error('Admin Add Driver Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Saves race results. If raceId is provided, it updates a scheduled race.
 */
export async function saveRaceResults(leagueId: string, track: string, results: any[], existingRaceId?: string) {
    try {
        // 1. Fetch Points Config
        const configRes = await getPointsConfig(leagueId);
        const config = configRes.success ? configRes.config : DEFAULT_CONFIG;

        let raceId = existingRaceId;

        // 2. Auto-Link if no ID provided
        if (!raceId) {
            const scheduled = await query<any>(
                `SELECT id FROM races WHERE league_id = ? AND track = ? AND is_finished = false ORDER BY scheduled_date ASC LIMIT 1`,
                [leagueId, track]
            );
            if (scheduled.length > 0) {
                raceId = scheduled[0].id;
                console.log(`Auto-linked to scheduled race: ${raceId}`);
            }
        }

        // 3. Create Race if not exists
        if (!raceId) {
            raceId = crypto.randomUUID();
            await run(
                `INSERT INTO races (id, league_id, track, is_finished, race_date) VALUES (?, ?, ?, true, CURRENT_TIMESTAMP)`,
                [raceId, leagueId, track]
            );
            console.log(`Race created: ${track} (${raceId})`);
        } else {
            // Update scheduled race to finished
            await run(
                `UPDATE races SET is_finished = true, race_date = CURRENT_TIMESTAMP WHERE id = ?`,
                [raceId]
            );
            console.log(`Race finished: ${track} (${raceId})`);
        }

        // 3. Insert Results
        for (const res of results) {
            const points = calculatePoints({
                position: res.position,
                qualiPosition: res.quali_position ? parseInt(res.quali_position as any) : undefined,
                fastestLap: res.fastest_lap,
                cleanDriver: res.clean_driver,
                isDnf: res.is_dnf
            }, config);

            const resultId = crypto.randomUUID();
            await run(
                `INSERT INTO race_results (id, race_id, driver_id, position, quali_position, fastest_lap, clean_driver, points_earned, is_dnf, pit_stops, warnings, penalties_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [resultId, raceId, res.driver_id, res.position, res.quali_position || 0, !!res.fastest_lap, !!res.clean_driver, points, !!res.is_dnf, res.pit_stops || 0, res.warnings || 0, res.penalties_time || 0]
            );
        }

        // 4. Recalculate Standings
        await recalculateStandings(leagueId);

        return { success: true, raceId };
    } catch (error: any) {
        console.error('Save Results Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Recalculates all driver totals for a league, accounting for drop results.
 */
export async function recalculateStandings(leagueId: string) {
    const drivers = await query<any>(`SELECT id FROM drivers WHERE league_id = ?`, [leagueId]);
    const configRes = await getPointsConfig(leagueId);
    const config = configRes.success ? configRes.config : DEFAULT_CONFIG;

    // Total finished races in this league
    const racesCountRes = await query<any>(`SELECT COUNT(*) as c FROM races WHERE league_id = ? AND is_finished = true`, [leagueId]);
    const finishedRaces = parseInt(racesCountRes[0].c || 0);

    // Max drops allowed is 25% of the highest between configured total races or finished races
    const referenceRaces = (config?.totalRaces && config.totalRaces > 0) ? config.totalRaces : finishedRaces;
    const maxDropsAllowed = Math.floor(referenceRaces * 0.25);
    const actualDrops = Math.min((config?.dropResultsCount || 0), maxDropsAllowed);

    for (const driver of drivers) {
        // Fetch all individual results for this driver
        const results = await query<any>(`SELECT id, points_earned FROM race_results WHERE driver_id = ?`, [driver.id]);

        let allPoints: { id: string | null; points: number }[] = results.map((r: any) => ({
            id: r.id,
            points: r.points_earned || 0
        }));

        // They missed races if they have fewer results than finished races, so we fill with 0s. 
        // We use null ID for missed races.
        while (allPoints.length < finishedRaces) {
            allPoints.push({ id: null, points: 0 });
        }

        const rawPoints = allPoints.reduce((sum, p) => sum + p.points, 0);

        // Sort ascending to find lowest
        const sortedPoints = [...allPoints].sort((a, b) => a.points - b.points);
        let totalPoints = rawPoints;
        let droppedResultIds: string[] = [];

        if (actualDrops > 0 && sortedPoints.length >= actualDrops) {
            const dropped = sortedPoints.slice(0, actualDrops);
            const droppedPointsSum = dropped.reduce((sum, p) => sum + p.points, 0);
            totalPoints -= droppedPointsSum;
            droppedResultIds = dropped.filter(d => d.id !== null).map(d => d.id as string);
        }

        // We store total and raw points in drivers table
        await run(`UPDATE drivers SET total_points = ?, raw_points = ? WHERE id = ?`, [totalPoints, rawPoints, driver.id]);

        // Update race_results flags
        if (results.length > 0) {
            // First clear old flags for this driver
            await run(`UPDATE race_results SET is_dropped = false WHERE driver_id = ?`, [driver.id]);

            // Set true for dropped results if any exist
            if (droppedResultIds.length > 0) {
                const placeholders = droppedResultIds.map(() => '?').join(',');
                await run(`UPDATE race_results SET is_dropped = true WHERE id IN (${placeholders})`, droppedResultIds);
            }
        }
    }
}

/**
 * Schedules a future race.
 */
export async function scheduleRace(leagueId: string, track: string, date: string, adminPass: string) {
    try {
        // Auth Check
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        const raceId = crypto.randomUUID();
        await run(
            `INSERT INTO races (id, league_id, track, is_finished, scheduled_date) VALUES (?, ?, ?, false, ?)`,
            [raceId, leagueId, track, date]
        );
        return { success: true };
    } catch (error: any) {
        console.error('Schedule Race Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches dashboard data including detailed statistics.
 */
export async function getDashboardData(leagueName: string) {
    try {
        // Check if leagueName is actually a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leagueName);
        let leagues;
        if (isUuid) {
            leagues = await query<any>(`SELECT id, name FROM leagues WHERE id = ?`, [leagueName]);
        } else {
            leagues = await query<any>(`SELECT id, name FROM leagues WHERE name = ?`, [leagueName]);
        }

        if (leagues.length === 0) throw new Error('League not found.');
        const leagueId = leagues[0].id;

        const standings = await query<any>(`
            SELECT d.*,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.position = 1) as wins,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.position <= 3) as podiums,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.fastest_lap = true) as fastest_laps,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.clean_driver = true) as clean_races
            FROM drivers d 
            WHERE d.league_id = ? 
            ORDER BY d.total_points DESC, wins DESC, podiums DESC
        `, [leagueId]);

        const finishedRaces = await query<any>(
            `SELECT * FROM races WHERE league_id = ? AND is_finished = true ORDER BY race_date ASC`,
            [leagueId]
        );

        const upcomingRaces = await query<any>(
            `SELECT * FROM races WHERE league_id = ? AND is_finished = false ORDER BY scheduled_date ASC`,
            [leagueId]
        );

        // Build Chronological Data for the Graph and Form Indicator
        // 1. Fetch all results for finished races in this league
        const allResults = await query<any>(`
            SELECT rr.race_id, rr.driver_id, rr.points_earned
            FROM race_results rr
            JOIN races r ON rr.race_id = r.id
            WHERE r.league_id = ? AND r.is_finished = true
            ORDER BY r.race_date ASC
        `, [leagueId]);

        // Map results by driver_id and race_id
        const resultsByRace: Record<string, Record<string, number>> = {};
        allResults.forEach((res: any) => {
            if (!resultsByRace[res.race_id]) resultsByRace[res.race_id] = {};
            resultsByRace[res.race_id][res.driver_id] = res.points_earned;
        });

        const graphData: any[] = [];
        const runningTotals: Record<string, number> = {};
        const previousPoints: Record<string, number> = {}; // Points from race N-1
        const latestPoints: Record<string, number> = {};   // Points from race N

        standings.forEach((d: any) => {
            runningTotals[d.id] = 0;
            d.formIndicator = 'SAME'; // Default
        });

        // Calculate running totals per race for the graph
        finishedRaces.forEach((race: any, index: number) => {
            const dataPoint: any = { name: race.track || `Race ${index + 1}` };

            standings.forEach((d: any) => {
                const earned = resultsByRace[race.id]?.[d.id] || 0;

                if (index === finishedRaces.length - 2) {
                    previousPoints[d.id] = earned;
                }
                if (index === finishedRaces.length - 1) {
                    latestPoints[d.id] = earned;
                }

                runningTotals[d.id] += earned;
                dataPoint[d.name] = runningTotals[d.id];
            });
            graphData.push(dataPoint);
        });

        // Determine Form Indicator
        if (finishedRaces.length >= 2) {
            standings.forEach((d: any) => {
                const prev = previousPoints[d.id] || 0;
                const curr = latestPoints[d.id] || 0;
                if (curr > prev) d.formIndicator = 'UP';
                else if (curr < prev) d.formIndicator = 'DOWN';
                else d.formIndicator = 'SAME';
            });
        } else if (finishedRaces.length === 1) {
            standings.forEach((d: any) => {
                const curr = latestPoints[d.id] || 0;
                if (curr > 0) d.formIndicator = 'UP';
                else d.formIndicator = 'SAME';
            });
        }

        const totalRaces = await query<any>(`SELECT COUNT(*) as count FROM races WHERE league_id = ? AND is_finished = true`, [leagueId]);

        const configRes = await getPointsConfig(leagueId);
        const config = configRes.success ? configRes.config : DEFAULT_CONFIG;

        // Calculate remaining tracks from the pool
        let remainingTracks: string[] = [];
        if (config?.trackPool && config.trackPool.length > 0) {
            const usedTracks = new Set([...finishedRaces, ...upcomingRaces].map((r: any) => r.track));
            remainingTracks = config.trackPool.filter(t => !usedTracks.has(t));
        }

        // Calculate max actual drops allowed
        const referenceRaces = (config?.totalRaces && config.totalRaces > 0) ? config.totalRaces : finishedRaces.length;
        const maxDropsAllowed = Math.floor(referenceRaces * 0.25);
        const actualDrops = Math.min((config?.dropResultsCount || 0), maxDropsAllowed);

        return {
            success: true,
            league: leagues[0],
            standings,
            races: finishedRaces.slice().reverse().slice(0, 10), // Keep recent races descending
            upcoming: upcomingRaces,
            graphData,
            stats: {
                totalRaces: totalRaces[0].count,
                plannedTotalRaces: config?.totalRaces || 0,
                remainingTracks,
                actualDrops,
                maxDropsAllowed
            },
            config
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches all available leagues.
 */
export async function getAllLeagues() {
    try {
        const leagues = await query<any>(`SELECT id, name FROM leagues ORDER BY name ASC`);
        return { success: true, leagues };
    } catch (error: any) {
        console.error('Fetch All Leagues Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches detailed results for a specific race.
 */
export async function getRaceDetails(raceId: string) {
    try {
        const race = await query<any>(`SELECT * FROM races WHERE id = ?`, [raceId]);
        if (race.length === 0) throw new Error('Race not found.');

        const results = await query<any>(`
            SELECT rr.*, d.name as driver_name, d.color as driver_color
            FROM race_results rr
            JOIN drivers d ON rr.driver_id = d.id
            WHERE rr.race_id = ?
            ORDER BY rr.position ASC
        `, [raceId]);

        return { success: true, race: race[0], results };
    } catch (error: any) {
        console.error('Fetch Race Details Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Seeds the database with test data.
 */
export async function seedTestData() {
    try {
        const leagueName = `Test League ${Date.now()}`;
        await createLeague(leagueName, 'admin', 'join');

        // Get the league ID
        const leagues = await query<any>(`SELECT id FROM leagues WHERE name = ?`, [leagueName]);
        const leagueId = leagues[0].id;

        // Add drivers
        await joinLeague(leagueName, 'join', 'Max Verstappen', 'Red Bull', '#0600ef');
        await joinLeague(leagueName, 'join', 'Lewis Hamilton', 'Mercedes', '#00d2be');
        await joinLeague(leagueName, 'join', 'Lando Norris', 'McLaren', '#ff8700');

        const drivers = await query<any>(`SELECT id FROM drivers WHERE league_id = ?`, [leagueId]);

        // Add a race
        const results = [
            { driver_id: drivers[0].id, position: 1, fastest_lap: true, clean_driver: true },
            { driver_id: drivers[1].id, position: 2, fastest_lap: false, clean_driver: true },
            { driver_id: drivers[2].id, position: 3, fastest_lap: false, clean_driver: false },
        ];

        await saveRaceResults(leagueId, 'Monza', results);

        return { success: true, leagueName };
    } catch (error: any) {
        console.error('Seed Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a race and recalculates driver standings.
 */
export async function deleteRace(raceId: string, leagueId: string, adminPass: string) {
    try {
        // 1. Auth Check
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized or invalid admin password.');
        }

        // 2. Perform deletion in one go if possible, but better-sqlite3 doesn't support complex transactions via run() easily without .transaction()
        // So we do it sequentially. The points update is the critical part.

        await run(`DELETE FROM race_results WHERE race_id = ?`, [raceId]);
        await run(`DELETE FROM races WHERE id = ?`, [raceId]);

        // 3. Recalculate all driver totals for this league
        await recalculateStandings(leagueId);

        console.log(`Race deleted: ${raceId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Delete Race Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a scheduled race.
 */
export async function deleteScheduledRace(raceId: string, leagueId: string, adminPass: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        await run(`DELETE FROM races WHERE id = ? AND is_finished = false`, [raceId]);
        return { success: true };
    } catch (error: any) {
        console.error('Delete Scheduled Race Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a driver from a league.
 * Requires league admin password.
 */
export async function deleteDriver(driverId: string, leagueId: string, adminPass: string) {
    try {
        // 1. Auth Check (League Admin)
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized or invalid admin password.');
        }

        // 2. Delete driver's results
        await run(`DELETE FROM race_results WHERE driver_id = ?`, [driverId]);

        // 3. Delete the driver
        await run(`DELETE FROM drivers WHERE id = ?`, [driverId]);

        console.log(`Driver deleted: ${driverId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Delete Driver Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches points configuration for a league.
 */
export async function getPointsConfig(leagueId: string) {
    try {
        const rows = await query<any>(`SELECT * FROM points_config WHERE league_id = ?`, [leagueId]);
        if (rows.length === 0) {
            return { success: true, config: DEFAULT_CONFIG };
        }

        const config: PointsConfig = {
            points: JSON.parse(rows[0].points_json),
            qualiPoints: rows[0].quali_points_json ? JSON.parse(rows[0].quali_points_json) : DEFAULT_CONFIG.qualiPoints,
            fastestLapBonus: rows[0].fastest_lap_bonus,
            cleanDriverBonus: rows[0].clean_driver_bonus,
            totalRaces: rows[0].total_races || 0,
            trackPool: rows[0].track_pool ? JSON.parse(rows[0].track_pool) : [],
            dropResultsCount: rows[0].drop_results_count || 0
        };

        return { success: true, config };
    } catch (error: any) {
        console.error('Get Points Config Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates points configuration for a league.
 */
export async function updatePointsConfig(leagueId: string, config: PointsConfig, adminPass: string) {
    try {
        // Auth Check
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized or invalid admin password.');
        }

        // Check if config exists
        const existingConfig = await query<any>(`SELECT league_id FROM points_config WHERE league_id = ?`, [leagueId]);

        if (existingConfig.length > 0) {
            await run(
                `UPDATE points_config SET 
                    points_json = ?, 
                    quali_points_json = ?,
                    fastest_lap_bonus = ?, 
                    clean_driver_bonus = ?,
                    total_races = ?,
                    track_pool = ?,
                    drop_results_count = ?
                 WHERE league_id = ?`,
                [JSON.stringify(config.points), JSON.stringify(config.qualiPoints || {}), config.fastestLapBonus, config.cleanDriverBonus, config.totalRaces || 0, JSON.stringify(config.trackPool || []), config.dropResultsCount || 0, leagueId]
            );
        } else {
            await run(
                `INSERT INTO points_config (league_id, points_json, quali_points_json, fastest_lap_bonus, clean_driver_bonus, total_races, track_pool, drop_results_count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [leagueId, JSON.stringify(config.points), JSON.stringify(config.qualiPoints || {}), config.fastestLapBonus, config.cleanDriverBonus, config.totalRaces || 0, JSON.stringify(config.trackPool || []), config.dropResultsCount || 0]
            );
        }

        // Recalculate standings since point rules might have changed
        await recalculateStandings(leagueId);

        return { success: true };
    } catch (error: any) {
        console.error('Update Points Config Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates results for an existing race.
 */
export async function updateRaceResults(leagueId: string, raceId: string, results: any[], adminPass: string) {
    try {
        // 1. Auth Check
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        // 2. Fetch Points Config
        const configRes = await getPointsConfig(leagueId);
        const config = configRes.success ? configRes.config : DEFAULT_CONFIG;

        // 3. Delete existing results for this race
        await run(`DELETE FROM race_results WHERE race_id = ?`, [raceId]);

        // 4. Insert new (updated) results
        for (const res of results) {
            const points = calculatePoints({
                position: parseInt(res.position as any),
                qualiPosition: res.quali_position ? parseInt(res.quali_position as any) : undefined,
                fastestLap: !!res.fastest_lap,
                cleanDriver: !!res.clean_driver,
                isDnf: !!res.is_dnf
            }, config);

            const resultId = crypto.randomUUID();
            await run(
                `INSERT INTO race_results (id, race_id, driver_id, position, quali_position, fastest_lap, clean_driver, points_earned, is_dnf, pit_stops, warnings, penalties_time)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [resultId, raceId, res.driver_id, res.position, res.quali_position || 0, !!res.fastest_lap, !!res.clean_driver, points, !!res.is_dnf, res.pit_stops || 0, res.warnings || 0, res.penalties_time || 0]
            );
        }

        // 5. Recalculate Standings
        await recalculateStandings(leagueId);

        return { success: true };
    } catch (error: any) {
        console.error('Update Results Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Checks for an active telemetry session for a specific league.
 */
export async function getActiveTelemetrySession(leagueId: string) {
    try {
        const active = await query<any>(
            `SELECT * FROM telemetry_sessions 
             WHERE league_id = ? 
             AND is_active = true 
             AND updated_at > NOW() - INTERVAL '2 minutes'
             ORDER BY created_at DESC LIMIT 1`,
            [leagueId]
        );
        if (active.length > 0) {
            // Also fetch participants and join with drivers for color
            const participants = await query<any>(
                `SELECT tp.*, d.color 
                 FROM telemetry_participants tp
                 LEFT JOIN drivers d ON tp.driver_id = d.id
                 WHERE tp.session_id = ? 
                 ORDER BY tp.position ASC`,
                [active[0].id]
            );
            return { success: true, session: active[0], participants };
        }
        return { success: true, session: null, participants: [] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches all unassigned players from recent telemetry sessions.
 * Requires admin.
 */
export async function getUnassignedTelemetryPlayers(leagueId: string, adminPass: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        const unassigned = await query<any>(`
            SELECT tp.game_name, tp.session_id, ts.created_at
            FROM telemetry_participants tp
            JOIN telemetry_sessions ts ON tp.session_id = ts.id
            WHERE ts.league_id = ? AND tp.driver_id IS NULL AND tp.is_human = true
            GROUP BY tp.game_name, tp.session_id, ts.created_at
            ORDER BY ts.created_at DESC
        `, [leagueId]);

        return { success: true, unassigned };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Assigns a driver ID to a game_name for a specific session.
 * We could also broadly update ALL sessions. Doing all where it's null.
 * ALso saves it to the drivers table so future sessions map automatically.
 */
export async function assignTelemetryPlayer(leagueId: string, adminPass: string, gameName: string, driverId: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        // Broad update: assign this driver ID to anywhere this gameName appears in this league's sessions where it's currently null
        const sessions = await query<any>(`SELECT id FROM telemetry_sessions WHERE league_id = ?`, [leagueId]);
        if (sessions.length > 0) {
            const sessionIds = sessions.map((s: any) => s.id);
            const placeholders = sessionIds.map(() => '?').join(',');

            await run(
                `UPDATE telemetry_participants SET driver_id = ? WHERE game_name = ? AND session_id IN (${placeholders})`,
                [driverId, gameName, ...sessionIds]
            );
        }

        // Also save to driver so it's auto-mapped in future
        await run(`UPDATE drivers SET game_name = ? WHERE id = ? AND league_id = ?`, [gameName, driverId, leagueId]);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Promotes a closed telemetry session into an official race result.
 */
export async function internalPromoteTelemetryToRace(leagueId: string, sessionId: string, track: string, existingRaceId?: string) {
    try {
        const participants = await query<any>(
            `SELECT tp.*, 
            (SELECT MIN(lap_time_ms) FROM telemetry_laps tl WHERE tl.participant_id = tp.id AND tl.is_valid = true) as fastest_lap_ms
            FROM telemetry_participants tp 
            WHERE tp.session_id = ? AND tp.driver_id IS NOT NULL
            ORDER BY tp.position ASC`,
            [sessionId]
        );

        if (participants.length === 0) {
            throw new Error('No assigned drivers found in this session to promote.');
        }

        let minLap = Infinity;
        let fastestDriverId: string | null = null;
        for (const p of participants) {
            if (p.fastest_lap_ms && p.fastest_lap_ms < minLap) {
                minLap = p.fastest_lap_ms;
                fastestDriverId = p.driver_id;
            }
        }

        const resultsToSave = participants.map((p: any) => ({
            driver_id: p.driver_id,
            position: p.position || 0,
            quali_position: p.start_position || 0,
            fastest_lap: p.driver_id === fastestDriverId,
            clean_driver: (p.warnings || 0) === 0 && (p.penalties_time || 0) === 0,
            is_dnf: false,
            pit_stops: p.pit_stops || 0,
            warnings: p.warnings || 0,
            penalties_time: p.penalties_time || 0
        }));

        const saveRes = await saveRaceResults(leagueId, track, resultsToSave, existingRaceId);

        if (saveRes.success && saveRes.raceId) {
            await run(`UPDATE telemetry_sessions SET race_id = ? WHERE id = ?`, [saveRes.raceId, sessionId]);
        }

        return saveRes;
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function promoteTelemetryToRace(leagueId: string, adminPass: string, sessionId: string, track: string, existingRaceId?: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) {
            throw new Error('Unauthorized.');
        }

        // 1. Get telemetry participants
        const participants = await query<any>(
            `SELECT tp.*, 
            (SELECT MIN(lap_time_ms) FROM telemetry_laps tl WHERE tl.participant_id = tp.id AND tl.is_valid = true) as fastest_lap_ms
            FROM telemetry_participants tp 
            WHERE tp.session_id = ? AND tp.driver_id IS NOT NULL
            ORDER BY tp.position ASC`,
            [sessionId]
        );

        if (participants.length === 0) {
            throw new Error('No assigned drivers found in this session to promote.');
        }

        // Find overall fastest lap to mark it
        let minLap = Infinity;
        let fastestDriverId: string | null = null;
        for (const p of participants) {
            if (p.fastest_lap_ms && p.fastest_lap_ms < minLap) {
                minLap = p.fastest_lap_ms;
                fastestDriverId = p.driver_id;
            }
        }

        const resultsToSave = participants.map((p: any) => ({
            driver_id: p.driver_id,
            position: p.position || 0,
            quali_position: p.start_position || 0,
            fastest_lap: p.driver_id === fastestDriverId,
            clean_driver: (p.warnings || 0) === 0 && (p.penalties_time || 0) === 0,
            is_dnf: false,
            pit_stops: p.pit_stops || 0,
            warnings: p.warnings || 0,
            penalties_time: p.penalties_time || 0
        }));

        // 2. Reuse the saveRaceResults logic
        const saveRes = await saveRaceResults(leagueId, track, resultsToSave, existingRaceId);

        if (saveRes.success && saveRes.raceId) {
            await run(`UPDATE telemetry_sessions SET race_id = ? WHERE id = ?`, [saveRes.raceId, sessionId]);
        }

        return saveRes;

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Updates a driver's In-Game Name.
 */
export async function updateDriverGameName(driverId: string, leagueId: string, adminPass: string, gameName: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) throw new Error('Unauthorized.');

        await run(`UPDATE drivers SET game_name = ? WHERE id = ? AND league_id = ?`, [gameName || null, driverId, leagueId]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Updates a driver's Color.
 */
export async function updateDriverColor(driverId: string, leagueId: string, adminPass: string, color: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) throw new Error('Unauthorized.');

        await run(`UPDATE drivers SET color = ? WHERE id = ? AND league_id = ?`, [color || '#ffffff', driverId, leagueId]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches all telemetry sessions for a league.
 */
export async function getAllTelemetrySessions(leagueId: string, adminPass: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) throw new Error('Unauthorized.');

        const sessions = await query<any>(`SELECT * FROM telemetry_sessions WHERE league_id = ? ORDER BY created_at DESC`, [leagueId]);

        // Count participants
        const participantsCount = await query<any>(`
            SELECT session_id, COUNT(*) as count 
            FROM telemetry_participants 
            WHERE session_id IN (SELECT id FROM telemetry_sessions WHERE league_id = ?)
            GROUP BY session_id
        `, [leagueId]);

        const countMap = new Map();
        participantsCount.forEach((p: any) => countMap.set(p.session_id, p.count));

        return {
            success: true,
            sessions: sessions.map((s: any) => ({ ...s, participants_count: countMap.get(s.id) || 0 }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a telemetry session.
 */
export async function deleteTelemetrySession(sessionId: string, leagueId: string, adminPass: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) throw new Error('Unauthorized.');

        await run(`DELETE FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id = ?)`, [sessionId]);
        await run(`DELETE FROM telemetry_participants WHERE session_id = ?`, [sessionId]);
        await run(`DELETE FROM telemetry_sessions WHERE id = ? AND league_id = ?`, [sessionId, leagueId]);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches details and participants for a specific telemetry session.
 */
export async function getTelemetrySessionDetails(leagueId: string, adminPass: string, sessionId: string) {
    try {
        const leagues = await query<any>(`SELECT admin_password FROM leagues WHERE id = ?`, [leagueId]);
        if (leagues.length === 0 || leagues[0].admin_password !== adminPass) throw new Error('Unauthorized.');

        const sessions = await query<any>(`SELECT * FROM telemetry_sessions WHERE id = ?`, [sessionId]);
        if (sessions.length === 0) throw new Error('Session not found.');

        const participants = await query<any>(
            `SELECT tp.*, 
            (SELECT MIN(lap_time_ms) FROM telemetry_laps tl WHERE tl.participant_id = tp.id AND tl.is_valid = true) as fastest_lap_ms
            FROM telemetry_participants tp 
            WHERE tp.session_id = ? 
            ORDER BY tp.position ASC`,
            [sessionId]
        );

        return { success: true, session: sessions[0], participants };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches detailed telemetry logic (laps, tyres, pits, etc) for a specific driver in a race.
 */
export async function getDriverRaceTelemetry(raceId: string, driverId: string) {
    try {
        const session = await query<any>(`SELECT id FROM telemetry_sessions WHERE race_id = ? LIMIT 1`, [raceId]);
        if (session.length === 0) return { success: true, laps: [] };

        const sessionId = session[0].id;

        const participant = await query<any>(`SELECT id FROM telemetry_participants WHERE session_id = ? AND driver_id = ? LIMIT 1`, [sessionId, driverId]);
        if (participant.length === 0) return { success: true, laps: [] };

        const participantId = participant[0].id;

        const laps = await query<any>(`
            SELECT lap_number, lap_time_ms, is_valid, tyre_compound, is_pit_lap
            FROM telemetry_laps
            WHERE participant_id = ?
            ORDER BY lap_number ASC
        `, [participantId]);

        return { success: true, laps };
    } catch (error: any) {
        console.error('Fetch Telemetry Laps Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetches organized telemetry laps for all drivers in a race (for the race overview chart).
 */
export async function getAllDriversRaceTelemetry(raceId: string) {
    try {
        const session = await query<any>(`SELECT id FROM telemetry_sessions WHERE race_id = ? LIMIT 1`, [raceId]);
        if (session.length === 0) return { success: true, laps: [], drivers: [] };

        const sessionId = session[0].id;

        const participants = await query<any>(`
            SELECT tp.id, tp.driver_id, d.name as driver_name, d.color as driver_color
            FROM telemetry_participants tp
            JOIN drivers d ON d.id = tp.driver_id
            WHERE tp.session_id = ? AND tp.driver_id IS NOT NULL
        `, [sessionId]);

        if (participants.length === 0) return { success: true, laps: [], drivers: [] };

        const laps = await query<any>(`
            SELECT tl.lap_number, tl.lap_time_ms, tl.participant_id, tl.is_pit_lap, tl.tyre_compound
            FROM telemetry_laps tl
            JOIN telemetry_participants tp ON tp.id = tl.participant_id
            WHERE tp.session_id = ? AND tl.is_valid = true AND (tl.lap_time_ms > 0 OR tl.lap_number = 0)
            ORDER BY tl.lap_number ASC
        `, [sessionId]);

        // Group by lap_number
        const chartDataMap = new Map<number, any>();
        laps.forEach((lap: any) => {
            const pInfo = participants.find((p: any) => p.id === lap.participant_id);
            if (!pInfo) return;

            if (!chartDataMap.has(lap.lap_number)) {
                chartDataMap.set(lap.lap_number, { lap_number: lap.lap_number });
            }

            const lapObj = chartDataMap.get(lap.lap_number);

            // Only set lap time for actual laps > 0
            if (lap.lap_number > 0) {
                lapObj[pInfo.driver_id] = lap.lap_time_ms;
            }

            // For Lap 0, we want to show the starting tyre.
            // For other laps, we only show it if they pitted.
            if (lap.is_pit_lap || lap.lap_number === 0) {
                lapObj[`${pInfo.driver_id}_pit`] = true;
                lapObj[`${pInfo.driver_id}_tyre`] = lap.tyre_compound;
            }
        });

        const formattedLaps = Array.from(chartDataMap.values()).sort((a, b) => a.lap_number - b.lap_number);

        return {
            success: true,
            laps: formattedLaps,
            drivers: participants.map((p: any) => ({ id: p.driver_id, name: p.driver_name, color: p.driver_color }))
        };
    } catch (error: any) {
        console.error('Fetch All Telemetry Laps Error:', error);
        return { success: false, error: error.message };
    }
}
