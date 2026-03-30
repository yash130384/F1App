const fs = require('fs');
const content = fs.readFileSync('src/lib/actions.ts', 'utf8');

// Use a more robust replacement that doesn't care about whitespace as much
const lines = content.split('\n');

// Find the verifyLeagueOwner function
const startIdx = lines.findIndex(l => l.includes('async function verifyLeagueOwner(leagueId: string) {'));

if (startIdx !== -1) {
    // We want to replace everything from the start of the function up to just before 'const driverId'
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('const driverId = crypto.randomUUID();'));
    
    if (endIdx !== -1) {
        const replacement = [
            `async function verifyLeagueOwner(leagueId: string) {`,
            `    const session = await getServerSession(authOptions) as any;`,
            `    if (!session || !session.user || !session.user.id) throw new Error('Unauthorized session.');`,
            `    const res = await query<any>('SELECT owner_id FROM leagues WHERE id = ?', [leagueId]);`,
            `    if (res.length === 0 || res[0].owner_id !== session.user.id) throw new Error('Unauthorized. Not the owner.');`,
            `}`,
            ``,
            `/**`,
            ` * Adds a driver to a league as an admin.`,
            ` */`,
            `export async function adminAddDriver(leagueId: string, adminPass: string, driverName: string, team: string, color: string, gameName?: string) {`,
            `    try {`,
            `        await verifyLeagueOwner(leagueId);`,
            ``
        ];
        
        lines.splice(startIdx, endIdx - startIdx, ...replacement);
        fs.writeFileSync('src/lib/actions.ts', lines.join('\n'));
        console.log('Fixed actions.ts');
    } else {
        console.log('Could not find marker for end of replacement');
    }
} else {
    console.log('Could not find start of verifyLeagueOwner');
}
