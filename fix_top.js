const fs = require('fs');
let lines = fs.readFileSync('src/lib/actions.ts', 'utf8').split('\n');

// Line 45 is index 44.
if (lines[44] && lines[44].trim() === '}' && lines[45] && lines[45].trim() === '') {
     console.log('Line 45/46 looking good?');
} else {
     console.log('Lines 44-46:', lines[44], lines[45], lines[46]);
     if (lines[44].includes('return') && !lines.slice(45, 48).some(l => l.includes('}'))) {
          console.log('Inserting missing brace at index 45.');
          lines.splice(45, 0, '}');
          fs.writeFileSync('src/lib/actions.ts', lines.join('\n'));
     }
}
