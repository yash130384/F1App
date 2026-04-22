
import { db } from '../src/lib/db';
import { races, raceResults, drivers } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

async function checkJapanResults() {
    console.log('Checking for Japan race...');
    const japanRace = await db.select().from(races).where(eq(races.track, 'Japan')).limit(1);
    if (japanRace.length === 0) {
        console.log('No race found with track "Japan"');
        return;
    }
    const raceId = japanRace[0].id;
    console.log(`Found Japan race with ID: ${raceId}`);

    const results = await db.select().from(raceResults).where(eq(raceResults.raceId, raceId));
    console.log(`Found ${results.length} results for Japan race.`);
    results.forEach(res => {
        console.log(`Driver ID: ${res.driverId}, Position: ${res.position}, Points: ${res.pointsEarned}`);
    });

    const allDrivers = await db.select().from(drivers);
    console.log('Driver total points:');
    allDrivers.forEach(d => {
        console.log(`Driver: ${d.name}, Total Points: ${d.totalPoints}`);
    });
}

checkJapanResults().catch(console.error);
