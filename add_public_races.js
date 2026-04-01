const fs = require('fs');
let content = fs.readFileSync('src/lib/actions.ts', 'utf8');

const getPublicLeagueRacesBody = `
/**
 * Fetches all races for a league (for drivers/public).
 * Hides the track if it's a future race and reveal time hasn't passed.
 */
export async function getPublicLeagueRaces(leagueId: string) {
    try {
        const races = await query<any>(\`
            SELECT id, track, scheduled_date, is_finished, is_random, reveal_hours_before 
            FROM races 
            WHERE league_id = ? 
            ORDER BY scheduled_date DESC, id DESC
        \`, [leagueId]);

        const now = new Date();
        const processed = races.map((r: any) => {
            if (r.is_finished) return r;
            
            // If reveal hours set, check if we should show track
            if (r.reveal_hours_before > 0 && r.scheduled_date) {
                const revealTime = new Date(r.scheduled_date);
                const sDate = new Date(r.scheduled_date);
                sDate.setHours(sDate.getHours() - r.reveal_hours_before);
                
                if (now < sDate) {
                    return { ...r, track: 'UNKNOWN LOCATION', is_hidden: true };
                }
            }

            return r;
        });

        return { success: true, races: processed };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
`;

if (!content.includes("export async function getPublicLeagueRaces")) {
     content = content.replace("export async function deleteScheduledRace", getPublicLeagueRacesBody + "\nexport async function deleteScheduledRace");
     fs.writeFileSync('src/lib/actions.ts', content);
     console.log('Added getPublicLeagueRaces to actions.ts');
} else {
    console.log('getPublicLeagueRaces already exists.');
}
