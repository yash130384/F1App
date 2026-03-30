const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/app/admin/page.tsx');
const destDir = path.join(__dirname, '../src/app/profile/leagues/[leagueId]');
const destPath = path.join(destDir, 'page.tsx');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

let content = fs.readFileSync(srcPath, 'utf8');

// The exported component needs params
content = content.replace('export default function AdminHub() {', 'export default function AdminHub({ params }: { params: { leagueId: string } }) {');

// Remove handles and states for login
content = content.replace(/const \[isLoggedIn, setIsLoggedIn\] = useState\(false\);/, 'const [isLoggedIn, setIsLoggedIn] = useState(true);'); // Hack to bypass loading
content = content.replace(/const \[leagueId, setLeagueId\] = useState<string \| null>\(null\);/, 'const leagueId = params.leagueId;');
content = content.replace(/const \[adminPass, setAdminPass\] = useState\(''\);/, 'const adminPass = "session";');

// Replace useEffect
content = content.replace(/useEffect\(\(\) => \{\n        refreshLeagues\(\);\n        checkSession\(\);\n    \}, \[\]\);/g, '');

content = content.replace('const checkSession = async () => {', `useEffect(() => {\n        async function init() {\n            setIsLoggedIn(true);\n            const pRes = await getPointsConfig(leagueId);\n            if (pRes.success && pRes.config) setPointsConfig(pRes.config);\n            const teamsRes = await getAllTeams(leagueId);\n            if (teamsRes.success) setTeams(teamsRes.teams || []);\n            refreshRaces(leagueId);\n            refreshTelemetry(leagueId, "session");\n            const driversRes = await getAdminLeagueDrivers(leagueId, "session");\n            if (driversRes.success) setDrivers(driversRes.drivers || []);\n            const dashRes = await getDashboardData(leagueId);\n            if(dashRes.success && dashRes.league) setLeagueName(dashRes.league.name);\n        }\n        if (leagueId) init();\n    }, [leagueId]);\n    const checkSession_unused = async () => {`);

// Also find the huge `if (!isLoggedIn) { ... return ... }` and remove or bypass it.
// We just bypass it by setting isLoggedIn to true.

fs.writeFileSync(destPath, content);
console.log('Moved and refactored AdminHub to profile/leagues/[leagueId]/page.tsx');

// Now remove src/app/admin/page.tsx
// To be safe not deleting the folder, just rename page.tsx to _page.tsx or delete securely
fs.unlinkSync(srcPath);
