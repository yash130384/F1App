import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL;

async function check() {
  const sql = neon(DATABASE_URL!);
  const leagues = await (sql as any).query("SELECT id, name FROM leagues");
  console.log('\ud83d\udcc1 Vorhandene Ligen in der DB:');
  console.log(JSON.stringify(leagues, null, 2));
}

check().catch(console.error);
