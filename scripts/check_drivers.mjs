import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const leagueId = '70133e74-2fd4-4b2d-ada5-069343dc26c0';

async function checkDrivers() {
    try {
        const drivers = await sql`SELECT id, name, game_name FROM drivers WHERE league_id = ${leagueId}`;
        console.table(drivers);
    } catch (e) {
        console.error(e);
    }
}

checkDrivers();
