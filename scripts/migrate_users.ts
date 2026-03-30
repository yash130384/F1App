import * as dotenv from 'dotenv';
dotenv.config();

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Wir nutzen pgClient nativ, um ohne Drizzle umständlichen setup auszukommen.
const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
    console.log("Starte User-Migration...");
    
    // 1. Hole alle Driver
    const drivers = await sql`SELECT id, name, game_name, color, league_id FROM drivers`;
    console.log(`Gefunden: ${drivers.length} Fahrer.`);

    // Wir bündeln alle Fahrer, die denselben game_name haben, auf EINEN User-Account.
    // Wenn game_name ler oder null ist, nutzen wir "name".
    const usersMap = new Map<string, { id: string, email: string, username: string, steamName: string, globalColor: string, driverIds: string[] }>();

    for (const d of drivers) {
        const username = d.game_name && d.game_name.trim() !== '' ? d.game_name : d.name;
        // Als E-Mail nutzen wir test@test.de.
        // Bessere E-Mail wäre test_<username>@test.de, da E-Mail UNIQUE sein muss in schema.ts.
        const email = `test_${username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@test.de`;

        if (!usersMap.has(username)) {
            usersMap.set(username, {
                id: crypto.randomUUID(),
                email: email,
                username: username,
                steamName: username,
                globalColor: d.color || '#ffffff',
                driverIds: []
            });
        }
        usersMap.get(username)!.driverIds.push(d.id);
    }

    const defaultPasswordHash = await bcrypt.hash('test', 10);
    console.log(`Zu erstellende User: ${usersMap.size}`);

    let count = 0;
    for (const [username, userData] of usersMap.entries()) {
        try {
            await sql`
                INSERT INTO users (id, email, password_hash, email_verified, username, global_color, steam_name)
                VALUES (${userData.id}, ${userData.email}, ${defaultPasswordHash}, true, ${userData.username}, ${userData.globalColor}, ${userData.steamName})
                ON CONFLICT (email) DO NOTHING
            `;

            for (const dId of userData.driverIds) {
                await sql`UPDATE drivers SET user_id = ${userData.id} WHERE id = ${dId}`;
            }
            count++;
        } catch (e: any) {
            console.error(`Fehler bei User ${username}: ${e.message}`);
        }
    }

    console.log(`Erfolgreich migriert: ${count} User.`);
}

migrate().catch(console.error);
