const fs = require('fs');
let content = fs.readFileSync('src/app/profile/leagues/[leagueId]/page.tsx', 'utf8');

// 1. Remove adminPass definition
content = content.replace(/const adminPass = "session";/g, '');

// 2. Remove isLoggedIn and authType states
content = content.replace(/const \[isLoggedIn, setIsLoggedIn\] = useState\(true\);/g, '');
content = content.replace(/const \[authType, setAuthType\] = useState<'league' | null>\(null\);/g, '');

// 3. Remove adminLogin from actions import if it exists (it will be unused)
// content = content.replace(/adminLogin,/g, '');

// 4. Remove handleLogin, handleLogout, checkSession_unused
const removeBlock = (startMarker, endMarker) => {
    const startIdx = content.indexOf(startMarker);
    if (startIdx !== -1) {
        const endIdx = content.indexOf(endMarker, startIdx);
        if (endIdx !== -1) {
            content = content.slice(0, startIdx) + content.slice(endIdx + endMarker.length);
        }
    }
};

removeBlock('const checkSession_unused = async () =>', '};');
removeBlock('const handleLogin = async (e: React.FormEvent) =>', '};');
removeBlock('const handleLogout = () =>', '};');

// 5. Cleanup useEffect(..., [leagueId])
// This is trickier, let's just do mass string replaces for the calls
content = content.replace(/refreshTelemetry\(leagueId, "session"\)/g, 'refreshTelemetry(leagueId)');
content = content.replace(/getAdminLeagueDrivers\(leagueId, "session"\)/g, 'getAdminLeagueDrivers(leagueId)');
content = content.replace(/setIsLoggedIn\(true\);/g, '');

// 6. Cleanup function definitions
content = content.replace(/async function refreshTelemetry\(lId: string, pass: string\)/g, 'async function refreshTelemetry(lId: string)');
content = content.replace(/getAllTelemetrySessions\(lId, pass\)/g, 'getAllTelemetrySessions(lId)');
content = content.replace(/getDiscoverableSessions\(lId, pass\)/g, 'getDiscoverableSessions(lId)');

fs.writeFileSync('src/app/profile/leagues/[leagueId]/page.tsx', content);
console.log('Profile page fixed via script');
