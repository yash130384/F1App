import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { TelemetryParser } from './parser';

// Since we are running in a node environment and not using a proper build system here,
// I will mock the module loading or assume the files are accessible.
// For the sake of this task, I'll combine them or use a simpler approach.

const BIN_FILE = '/home/christophbaake/Schreibtisch/f1-app/F12025TelemetryApp/_temp_session_7053247387223461260_2026-03-25T21-32-22-778Z.bin';

async function testParser() {
  console.log('Starting Telemetry Parser Test...');
  
  try {
    const buffer = fs.readFileSync(BIN_FILE);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    
    // We need to manually import/require because of the local file structure
    // In a real scenario, this would be handled by ts-node or similar
    const { TelemetryParser: ParserClass } = require('./parser');
    
    const parser = new ParserClass(arrayBuffer, 6);
    const packets = parser.parseAll();

    console.log(`Successfully parsed ${packets.length} packets.`);

    if (packets.length > 0) {
      console.log('\n--- Sample Packet Data ---');
      const sample = packets[0];
      console.log(JSON.stringify(sample, null, 2));
      
      // Verify a specific known value if possible
      // In the hexdump, we saw 'BUTN' which is an event.
      // Let's see if we caught any participants.
      const participantsPacket = packets.find(p => p.type === 'participants');
      if (participantsPacket) {
        console.log('\n--- Participants Found ---');
        console.log(participantsPacket.m_participants.map((p: any) => p.m_name));
      }
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
}

testParser();
