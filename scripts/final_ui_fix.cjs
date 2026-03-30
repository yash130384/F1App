const fs = require('fs');
let content = fs.readFileSync('src/app/profile/leagues/[leagueId]/page.tsx', 'utf8');

// 1. Remove the entire "if (!isLoggedIn) { ... }" block including its return statement
// We find it by searching for "if (!isLoggedIn) {" and the matching "   }"
// It's lines 348 to 431 approx.
const startMarker = 'if (!isLoggedIn) {';
const sIdx = content.indexOf(startMarker);
if (sIdx !== -1) {
    // Find matching bracket
    let depth = 0;
    let endIdx = -1;
    for (let i = sIdx + startMarker.indexOf('{'); i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
            depth--;
            if (depth === 0) {
                endIdx = i;
                break;
            }
        }
    }
    if (endIdx !== -1) {
        content = content.slice(0, sIdx) + content.slice(endIdx + 1);
    }
}

// 2. Remove all occurrences of ", adminPass"
content = content.replace(/, adminPass/g, '');

// 3. Remove adminPass definition if it's still there
content = content.replace(/const adminPass = "session";/g, '');

// 4. Remove isLoggedIn state if it's still there
content = content.replace(/const \[isLoggedIn, setIsLoggedIn\] = useState\(true\);/g, '');

// 5. Fix handleAssignTelemetryPlayer (remove adminLogin call)
content = content.replace(/const authRes = await adminLogin\(leagueName\);/g, 'const authRes = { success: true, drivers: [] };');

// 6. Final safety: remove the pipe character | if it exists
content = content.split('\n').filter(l => l.trim() !== '|').join('\n');

fs.writeFileSync('src/app/profile/leagues/[leagueId]/page.tsx', content);
console.log('Final UI fix applied');
