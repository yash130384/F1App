const fs = require('fs');
const filePath = 'c:\\Users\\der_b\\Desktop\\F1App\\recordings\\session_13101448679500257999_2026-04-01T18-29-25-384Z.bin';

const bin = fs.readFileSync(filePath);
console.log('--- Binary String Scan ---');

// Search for any printable ASCII strings of length > 3
for (let i = 0; i < 1000000; i++) {
    if (bin[i] >= 0x41 && bin[i] <= 0x5A) { // A-Z
        let str = '';
        let j = i;
        while (j < bin.length && bin[j] >= 0x20 && bin[j] <= 0x7E && str.length < 32) {
            str += String.fromCharCode(bin[j]);
            j++;
        }
        if (str.length > 5) {
            console.log(`Found String "${str}" at offset ${i}`);
            // Backtrack to find the nearest E9 07
            let search = i;
            while (search > i - 2000 && search >= 0) {
                if (bin[search] === 0xE9 && bin[search+1] === 0x07) {
                    console.log(`  Nearest F1 Header (E9 07) at offset ${search}`);
                    console.log(`  Distance to Header: ${i - search} bytes`);
                    break;
                }
                search--;
            }
        }
        i = j; // Skip
    }
}
