const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/app/admin/results/page.tsx');
const destDir = path.join(__dirname, '../src/app/profile/leagues/[leagueId]/results');
const destPath = path.join(destDir, 'page.tsx');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

let content = fs.readFileSync(srcPath, 'utf8');

// The exported component needs params
content = content.replace('export default function ManualEntry() {', 'export default function ManualEntry({ params }: { params: { leagueId: string } }) {');

// Remove handles and states for login
content = content.replace(/const \[isLoggedIn, setIsLoggedIn\] = useState\(false\);/, 'const isLoggedIn = true;\n    const leagueId = params.leagueId;');
content = content.replace(/const \[leagueId, setLeagueId\] = useState<string \| null>\(null\);/, '');

// Replace useEffect
content = content.replace(/useEffect\(\(\) => \{\n        const session = localStorage.getItem\('f1_admin_session'\);\n        if \(session\) \{\n            const parsed = JSON.parse\(session\);\n            setIsLoggedIn\(true\);\n            if \(parsed\.type === 'league'\) \{\n                setLeagueId\(parsed\.leagueId || null\);\n                setAdminPass\(parsed\.pass\);\n                loadDrivers\(parsed\.leagueId, parsed\.pass\);\n            \}\n        \}\n    \}, \[\]\);/g, `useEffect(() => { loadDrivers(leagueId, "session"); }, [leagueId]);`);

fs.writeFileSync(destPath, content);
fs.unlinkSync(srcPath);
console.log('Moved and refactored manual entry');
