import * as fs from 'fs';
import { TelemetryParser } from './parser';
import { TelemetryService } from './telemetry-service';
// @ts-ignore
import { db } from '../../lib/db';
// @ts-ignore
import { leagues, races, drivers, users } from '../../lib/schema';
import { eq } from 'drizzle-orm';

const BIN_FILE = '/home/christophbaake/Schreibtisch/f1-app/F12025TelemetryApp/_temp_session_7053247387223461260_2026-03-25T21-32-22-778Z.bin';

async function runE2ETest() {
  console.log('🚀 Starting End-to-End Telemetry Integration Test...');

  try {
    console.log('🛠️  Setting up test environment in DB...');
    
    const [testUser] = await db.insert(users).values({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
      passwordHash: 'hash',
      username: 'testuser',
    }).onConflictDoNothing().returning();

    const user = testUser || (await db.select().from(users).where(eq(users.email, 'test@example.com')))[0];

    const [testLeague] = await db.insert(leagues).values({
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test Telemetry League',
      ownerId: user.id,
    }).onConflictDoNothing().returning();

    const league = testLeague || (await db.select().from(leagues).where(eq(leagues.name, 'Test Telemetry League')))[0];

    const [testRace] = await db.insert(races).values({
      id: '00000000-0000-0000-0000-000000000003',
      leagueId: league.id,
      track: 'Spa-Francorchamps',
      raceDate: new Date(),
    }).onConflictDoNothing().returning();

    const race = testRace || (await db.select().from(races).where(eq(races.track, 'Spa-Francorchamps')))[0];

    await db.insert(drivers).values({
      id: '00000000-0000-0000-0000-000000000004',
      userId: user.id,
      leagueId: league.id,
      name: 'Max Verstappen',
      gameName: 'VERSTAPP', 
    }).onConflictDoNothing();

    console.log('📂 Loading binary file...');
    const buffer = fs.readFileSync(BIN_FILE);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    
    console.log('🔍 Parsing telemetry data...');
    const parser = new TelemetryParser(arrayBuffer, 6);
    const parsedPackets = parser.parseAll();
    
    console.log(`✅ Successfully parsed ${parsedPackets.length} packets.`);

    const sessionData: any = {
      header: parsedPackets[0].header,
      participants: parsedPackets.find(p => p.type === 'participants')?.m_participants || [],
      motionPackets: parsedPackets.filter(p => p.type === 'motion'),
      telemetryPackets: parsedPackets.filter(p => p.type === 'car_telemetry'),
      lapDataPackets: parsedPackets.filter(p => p.type === 'lap_data'),
    };

    console.log('💾 Saving session and participants to database...');
    const service = new TelemetryService();
    
    const sessionId = await service.saveFullSession(
      league.id,
      race.id,
      1,
      sessionData
    );

    console.log(`✨ SUCCESS! Session saved with ID: ${sessionId}`);
    console.log('🏁 End-to-End Test Completed Successfully.');

  } catch (error) {
    console.error('❌ E2E Test Failed!');
    console.error(error);
    process.exit(1);
  }
}

runE2ETest();
