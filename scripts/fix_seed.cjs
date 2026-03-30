const fs = require('fs');
const actionsPath = 'src/lib/actions.ts';
let code = fs.readFileSync(actionsPath, 'utf8');

code = code.replace(/await createLeague\(leagueName, 'admin', 'join'\);/g, 'await createLeague(leagueName);');
code = code.replace(/await joinLeague\(leagueName, 'join', /g, 'await joinLeague(leagueName, ');

fs.writeFileSync(actionsPath, code);
console.log('Fixed actions.ts');
