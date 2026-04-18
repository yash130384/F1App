import * as fs from 'fs';
import { TelemetryParser } from './parser.js';

const BIN_FILE = '/home/christophbaake/Schreibtisch/f1-app/F12025TelemetryApp/_temp_session_7053247387223461260_2026-03-25T21-32-22-778Z.bin';

function testParser() {
  console.log('Starting Telemetry Parser Test...');
  
  try {
    const buffer = fs.readFileSync(BIN_FILE);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    
    const parser = new TelemetryParser(arrayBuffer, 6);
    const packets = parser.parseAll();

    console.log(`Successfully parsed ${packets.length} packets.`);

    if (packets.length > 0) {
      console.log('\n--- Sample Packet Data (First 3 packets) ---');
      for (let i = 0; i < Math.min(3, packets.length); i++) {
        console.log(`\nPacket ${i}:`);
        console.log(JSON.stringify(packets[i], null, 2));
      }
      
      const participantsPacket = packets.find((p: any) => p.type === 'participants');
      if (participantsPacket) {
        console.log('\n--- Participants Found ---');
        console.log(participantsPacket.m_participants.map((p: any) => p.m_name));
      } else {
        console.log('\nNo participants packet found.');
      }
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testParser();
