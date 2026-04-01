const fs = require('fs');
let content = fs.readFileSync('src/lib/actions.ts', 'utf8');

const scheduleRaceBody = `
/**
 * Schedules a new race.
 */
export async function scheduleRace(leagueId: string, data: { track: string, date: string, isRandom: boolean, revealHours: number }) {
    try {
        await verifyLeagueOwner(leagueId);
        
        const raceId = crypto.randomUUID();
        await run(
            'INSERT INTO races (id, league_id, track, scheduled_date, is_finished, is_random, reveal_hours_before) VALUES (?, ?, ?, ?, false, ?, ?)',
            [raceId, leagueId, data.track, data.date, data.isRandom ? 1 : 0, data.revealHours]
        );
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
`;

if (!content.includes("export async function scheduleRace")) {
     content = content.replace("export async function deleteDriver", scheduleRaceBody + "\nexport async function deleteDriver");
     fs.writeFileSync('src/lib/actions.ts', content);
     console.log('Added scheduleRace to actions.ts');
} else {
    console.log('scheduleRace already exists.');
}
