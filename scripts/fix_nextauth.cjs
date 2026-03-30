const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '../src/app/api/auth/[...nextauth]/route.ts');
let content = fs.readFileSync(authPath, 'utf8');

content = content.replace('// Optionale Custom Pages können hier später referenziert werden', '');
content = content.replace('// signIn: \'/login\',', 'signIn: \'/login\',');

fs.writeFileSync(authPath, content);
console.log('NextAuth config updated.');
