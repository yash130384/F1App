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
            `INSERT INTO points_config (league_id, points_json, fastest_lap_bonus, clean_driver_bonus)
             VALUES (?, ?, ?, ?)`,
            [leagueId, JSON.stringify(DEFAULT_CONFIG.points), DEFAULT_CONFIG.fastestLapBonus, DEFAULT_CONFIG.cleanDriverBonus]
        );

        console.log(`League created: ${name}`);
        return { success: true };
    } catch (error: any) {
        console.error('Create League Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validates a league for joining and creates a driver.
 */
export async function joinLeague(leagueName: string, joinPass: string, driverName: string, team: string) {
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
            `INSERT INTO drivers (id, league_id, name, team) VALUES (?, ?, ?, ?)`,
            [driverId, leagueId, driverName, team]
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
            `SELECT id, name FROM drivers WHERE league_id = ?`,
            [leagues[0].id]
        );

        return { success: true, leagueId: leagues[0].id, drivers };
    } catch (error: any) {
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

        // 2. Create Race if not exists
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
                fastestLap: res.fastest_lap,
                cleanDriver: res.clean_driver,
                isDnf: res.is_dnf
            }, config);

            const resultId = crypto.randomUUID();
            await run(
                `INSERT INTO race_results (id, race_id, driver_id, position, fastest_lap, clean_driver, points_earned, is_dnf)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [resultId, raceId, res.driver_id, res.position, !!res.fastest_lap, !!res.clean_driver, points, !!res.is_dnf]
            );
        }

        // 4. Recalculate Standings
        await recalculateStandings(leagueId);

        return { success: true };
    } catch (error: any) {
        console.error('Save Results Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Recalculates all driver totals for a league.
 */
export async function recalculateStandings(leagueId: string) {
    const drivers = await query<any>(`SELECT id FROM drivers WHERE league_id = ?`, [leagueId]);

    for (const driver of drivers) {
        const results = await query<any>(`SELECT SUM(points_earned) as total FROM race_results WHERE driver_id = ?`, [driver.id]);
        const newTotal = results[0].total || 0;
        await run(`UPDATE drivers SET total_points = ? WHERE id = ?`, [newTotal, driver.id]);
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
        const leagues = await query<any>(`SELECT id, name FROM leagues WHERE name = ?`, [leagueName]);
        if (leagues.length === 0) throw new Error('League not found.');
        const leagueId = leagues[0].id;

        const standings = await query<any>(`
            SELECT d.*,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.position = 1) as wins,
                (SELECT COUNT(*) FROM race_results rr WHERE rr.driver_id = d.id AND rr.position <= 3) as podiums
            FROM drivers d 
            WHERE d.league_id = ? 
            ORDER BY d.total_points DESC, wins DESC, podiums DESC
        `, [leagueId]);

        const finishedRaces = await query<any>(
            `SELECT * FROM races WHERE league_id = ? AND is_finished = true ORDER BY race_date DESC LIMIT 10`,
            [leagueId]
        );

        const upcomingRaces = await query<any>(
            `SELECT * FROM races WHERE league_id = ? AND is_finished = false ORDER BY scheduled_date ASC`,
            [leagueId]
        );

        const totalRaces = await query<any>(`SELECT COUNT(*) as count FROM races WHERE league_id = ? AND is_finished = true`, [leagueId]);

        return {
            success: true,
            league: leagues[0],
            standings,
            races: finishedRaces,
            upcoming: upcomingRaces,
            stats: { totalRaces: totalRaces[0].count }
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
            SELECT rr.*, d.name as driver_name 
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
        await joinLeague(leagueName, 'join', 'Max Verstappen', 'Red Bull');
        await joinLeague(leagueName, 'join', 'Lewis Hamilton', 'Mercedes');
        await joinLeague(leagueName, 'join', 'Lando Norris', 'McLaren');

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
 * Deletes an entire league and all associated data.
 * Requires global admin credentials.
 */
export async function deleteLeague(leagueId: string, globalUser: string, globalPass: string) {
    try {
        if (globalUser !== 'admin' || globalPass !== 'admin') {
            throw new Error('Unauthorized: Invalid Global Admin credentials.');
        }

        // 1. Delete all results for drivers in this league
        const drivers = await query<any>(`SELECT id FROM drivers WHERE league_id = ?`, [leagueId]);
        for (const d of drivers) {
            await run(`DELETE FROM race_results WHERE driver_id = ?`, [d.id]);
        }

        // 2. Delete all races
        await run(`DELETE FROM races WHERE league_id = ?`, [leagueId]);

        // 3. Delete all drivers
        await run(`DELETE FROM drivers WHERE league_id = ?`, [leagueId]);

        // 4. Delete the league
        await run(`DELETE FROM leagues WHERE id = ?`, [leagueId]);

        console.log(`League deleted: ${leagueId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Delete League Error:', error);
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
            fastestLapBonus: rows[0].fastest_lap_bonus,
            cleanDriverBonus: rows[0].clean_driver_bonus
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

        await run(
            `INSERT OR REPLACE INTO points_config (league_id, points_json, fastest_lap_bonus, clean_driver_bonus)
             VALUES (?, ?, ?, ?)`,
            [leagueId, JSON.stringify(config.points), config.fastestLapBonus, config.cleanDriverBonus]
        );

        return { success: true };
    } catch (error: any) {
        console.error('Update Points Config Error:', error);
        return { success: false, error: error.message };
    }
}
