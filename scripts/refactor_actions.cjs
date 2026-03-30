const fs = require('fs');
const path = require('path');

const actionsPath = path.join(__dirname, '../src/lib/actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

// 1. Add imports to the top
const importStatement = `import { getServerSession } from "next-auth/next";\nimport { authOptions } from "@/app/api/auth/[...nextauth]/route";\n\nasync function verifyLeagueOwner(leagueId: string) {\n    const session = await getServerSession(authOptions) as any;\n    if (!session || !session.user || !session.user.id) throw new Error('Unauthorized session.');\n    const leagues = await query<any>(\`SELECT owner_id FROM leagues WHERE id = ?\`, [leagueId]);\n    if (leagues.length === 0 || leagues[0].owner_id !== session.user.id) throw new Error('Unauthorized. Not the owner.');\n}`;

if (!content.includes('verifyLeagueOwner')) {
    content = content.replace("import { query, run } from './db';", `import { query, run } from './db';\n\n${importStatement}`);
}

// 2. Replace pattern 1: SELECT admin_password ... if (leagues[0].admin_password !== adminPass)
content = content.replace(/const leagues = await query<any>\(\s*`SELECT admin_password FROM leagues WHERE id = \?`,\s*\[leagueId\]\s*\);\s*if\s*\(\w+\.length === 0 \|\| \w+\[0\]\.admin_password !== adminPass\)\s*\{\s*throw new Error\('Unauthorized(\.|\s.*?)?'\);\s*\}/g, 'await verifyLeagueOwner(leagueId);');

// 3. Replace pattern 2: SELECT id FROM leagues WHERE id = ? AND admin_password = ?
content = content.replace(/const leagues = await query<any>\(\s*`SELECT id FROM leagues WHERE id = \? AND admin_password = \?`,\s*\[leagueId,\s*adminPass\]\s*\);\s*if\s*\(\w+\.length === 0\)\s*throw new Error\('Unauthorized(\.|\s.*?)?'\);/g, 'await verifyLeagueOwner(leagueId);');

// 4. Update createLeague signature and insert query
// from: export async function createLeague(name: string, adminPass: string, joinPass: string) { ... INSERT INTO leagues (id, name, admin_password, join_password) VALUES (?, ?, ?, ?)
content = content.replace(/export async function createLeague\(name: string, adminPass: string, joinPass: string\) \{([\s\S]*?)INSERT INTO leagues \(id, name, admin_password, join_password\) VALUES \(\?, \?, \?, \?\)`,\s*\[leagueId, name, adminPass, joinPass\]/g, 
`export async function createLeague(name: string) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || !session.user || !session.user.id) throw new Error('Unauthorized session.');
        const userId = session.user.id;
        const leagueId = crypto.randomUUID();
        await run(
            \`INSERT INTO leagues (id, name, owner_id) VALUES (?, ?, ?)\`,
            [leagueId, name, userId]`);

// 5. Update joinLeague signature
// export async function joinLeague(leagueName: string, joinPass: string, driverName: string, team: string, color: string, gameName?: string)
content = content.replace(/export async function joinLeague\(leagueName: string, joinPass: string,/g, 'export async function joinLeague(leagueName: string,');
// Remove joinPassword check inside joinLeague
content = content.replace(/const leagues = await query<any>\(\s*`SELECT id, join_password FROM leagues WHERE name = \?`,\s*\[leagueName\]\s*\);\s*if \(leagues\.length === 0\) throw new Error\('League not found\.'\);\s*if \(leagues\[0\]\.join_password !== joinPass\) throw new Error\('Incorrect Join Password\.'\);/g, 
`const leagues = await query<any>(
            \`SELECT id FROM leagues WHERE name = ?\`,
            [leagueName]
        );
        if (leagues.length === 0) throw new Error('League not found.');`);

// 6. Fix adminLogin (since we don't login to a league anymore, maybe we just fetch drivers?)
// wait, the UI won't use adminLogin. It will just fetch leagues for a user.
// Let's add getUserLeagues.
const getUserLeaguesFunc = `
export async function getUserLeagues() {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || !session.user || !session.user.id) throw new Error('Unauthorized');
        const leagues = await query<any>(\`SELECT id, name FROM leagues WHERE owner_id = ? ORDER BY name ASC\`, [session.user.id]);
        return { success: true, leagues };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
`;
if (!content.includes('getUserLeagues')) {
    content += getUserLeaguesFunc;
}

fs.writeFileSync(actionsPath, content);
console.log("actions.ts refactored successfully.");
