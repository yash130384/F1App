import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function recalculate() {
    console.log("Starting hacky recalculation script for is_dropped...");
    const sql = neon(process.env.DATABASE_URL);

    try {
        const leagues = await sql`SELECT id FROM leagues`;

        for (const league of leagues) {
            console.log("League:", league.id);
            const configRows = await sql`SELECT * FROM points_config WHERE league_id = ${league.id}`;
            const config = configRows[0];

            const drivers = await sql`SELECT id FROM drivers WHERE league_id = ${league.id}`;

            const finishedRacesRes = await sql`SELECT COUNT(*) as c FROM races WHERE league_id = ${league.id} AND is_finished = true`;
            const finishedRaces = parseInt(finishedRacesRes[0].c || 0);

            const referenceRaces = (config?.total_races && config.total_races > 0) ? config.total_races : finishedRaces;
            const maxDropsAllowed = Math.floor(referenceRaces * 0.25);
            const actualDrops = Math.min((config?.drop_results_count || 0), maxDropsAllowed);

            console.log("Drops allowed:", actualDrops);

            for (const driver of drivers) {
                const results = await sql`SELECT id, points_earned FROM race_results WHERE driver_id = ${driver.id}`;

                let allPoints = results.map(r => ({
                    id: r.id,
                    points: r.points_earned || 0
                }));

                while (allPoints.length < finishedRaces) {
                    allPoints.push({ id: null, points: 0 });
                }

                const rawPoints = allPoints.reduce((sum, p) => sum + p.points, 0);
                const sortedPoints = [...allPoints].sort((a, b) => a.points - b.points);
                let totalPoints = rawPoints;
                let droppedResultIds = [];

                if (actualDrops > 0 && sortedPoints.length >= actualDrops) {
                    const dropped = sortedPoints.slice(0, actualDrops);
                    const droppedPointsSum = dropped.reduce((sum, p) => sum + p.points, 0);
                    totalPoints -= droppedPointsSum;
                    droppedResultIds = dropped.filter(d => d.id !== null).map(d => d.id);
                }

                await sql`UPDATE drivers SET total_points = ${totalPoints}, raw_points = ${rawPoints} WHERE id = ${driver.id}`;

                if (results.length > 0) {
                    await sql`UPDATE race_results SET is_dropped = false WHERE driver_id = ${driver.id}`;
                    if (droppedResultIds.length > 0) {
                        for (const droppedId of droppedResultIds) {
                            await sql`UPDATE race_results SET is_dropped = true WHERE id = ${droppedId}`;
                        }
                    }
                }
            }
        }

        console.log("Recalculation applied to database.");

    } catch (e) {
        console.error("Error:", e);
    }
}

recalculate().catch(console.error);
