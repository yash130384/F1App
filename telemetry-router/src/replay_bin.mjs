
import dgram from 'dgram';
import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/der_b/Desktop/F1App/recordings/session_14668411044586209823_2026-03-11T20-14-35-318Z.bin';
const PORT = 20777;
const client = dgram.createSocket('udp4');

async function replay() {
    const stats = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    
    let offset = 0;
    let packetCount = 0;

    console.log(`🚀 Starte Replay von ${filePath} an Port ${PORT}...`);

    while (offset < stats.size) {
        const headerBuffer = Buffer.alloc(6);
        fs.readSync(fd, headerBuffer, 0, 6, offset);
        offset += 6;

        const length = headerBuffer.readUInt16LE(4);
        if (length === 0 || length > 2000) break;

        const packetBuffer = Buffer.alloc(length);
        fs.readSync(fd, packetBuffer, 0, length, offset);
        offset += length;

        // Versende Paket via UDP
        client.send(packetBuffer, 0, length, PORT, 'localhost');
        packetCount++;

        // Simulation der Echtzeit: F1 sendet ca. 20-60 Pakete pro Sekunde
        // Wir machen es etwas schneller zum Testen, aber nicht so schnell, dass der Puffer überläuft
        if (packetCount % 100 === 0) {
             await new Promise(r => setTimeout(r, 10)); // Kurze Pause alle 100 Pakete
             process.stdout.write(`\rGesendete Pakete: ${packetCount}`);
        }
    }

    console.log(`\n✅ Replay abgeschlossen. ${packetCount} Pakete gesendet.`);
    client.close();
    fs.closeSync(fd);
}

replay().catch(console.error);
