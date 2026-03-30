const fs = require('fs');

let content = fs.readFileSync('src/lib/actions.ts', 'utf8');

const regex1 = /const leagues = await query<any>\(`SELECT admin_password FROM leagues WHERE id = \?`, \[leagueId\]\);\s*if \(leagues\.length === 0 \|\| leagues\[0\]\.admin_password !== adminPass\) throw new Error\('Unauthorized\.'\);/g;
content = content.replace(regex1, 'await verifyLeagueOwner(leagueId);');

const regex2 = /const leagues = await query<any>\([\s\S]*?`SELECT id FROM leagues WHERE id = \? AND admin_password = \?`,[\s\S]*?\[leagueId, adminPass\]\s*\);\s*if \(leagues\.length === 0\) throw new Error\('Invalid Admin Credentials\.'\);/g;
content = content.replace(regex2, 'await verifyLeagueOwner(leagueId);');

const adminLoginRegex = /export async function adminLogin\(leagueName: string, adminPass: string\) {[\s\S]*?return { success: false, error: error.message };\s*}/m;
content = content.replace(adminLoginRegex, `export async function adminLogin(leagueName: string, adminPass: string) {\n  return { success: false, error: 'Deprecated.' };\n}`);

fs.writeFileSync('src/lib/actions.ts', content);
console.log('Fixed scripts');
