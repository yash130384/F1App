const fs = require('fs');
const p = 'src/app/profile/leagues/[leagueId]/page.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace('checkSession();', '');
txt = txt.replace('setLeagueId(res.leagueId);', '// setLeagueId');
txt = txt.replace('setLeagueId(null);', '// removed setLeagueId');

fs.writeFileSync(p, txt);
console.log('Fixed');
