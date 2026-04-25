import { db } from '../src/lib/db';
import { leagues } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

async function check() {
  const allLeagues = await db.select().from(leagues);
  console.log('All Leagues:', JSON.stringify(allLeagues, null, 2));
}

check().catch(console.error);
