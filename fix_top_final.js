const fs = require('fs');
let lines = fs.readFileSync('src/lib/actions.ts', 'utf8').split('\n');

// Line 46 is index 45.
console.log('Line 45 (index 44):', lines[44]);
console.log('Line 46 (index 45):', lines[45]);

if (lines[44].trim() === '}' && lines[45].trim() === '') {
     console.log('Inserting brace at index 45...');
     lines[45] = '}';
     fs.writeFileSync('src/lib/actions.ts', lines.join('\n'));
     console.log('Done!');
}
