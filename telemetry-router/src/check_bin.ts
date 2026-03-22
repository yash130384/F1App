import fs from 'fs';
const file = 'c:/Users/der_b/Desktop/F1App/recordings/session_7857360973421438752_2026-03-18T20-20-09-962Z.bin';
const buffer = Buffer.alloc(100);
const fd = fs.openSync(file, 'r');
fs.readSync(fd, buffer, 0, 100, 0);
fs.closeSync(fd);
console.log(buffer.toString('hex'));
