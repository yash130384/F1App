"use server";

import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';

export async function registerUser(formData: FormData) {
    const email = formData.get('email') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const steamName = formData.get('steamName') as string;
    const gameName = formData.get('gameName') as string;

    if (!email || !username || !password) {
        return { success: false, error: 'MISSING REQUIRED FIELDS: EMAIL, USERNAME, OR KEY.' };
    }

    try {
        // Check if user already exists
        const existingUser = await db.select()
            .from(users)
            .where(or(eq(users.email, email), eq(users.username, username)))
            .limit(1);

        if (existingUser.length > 0) {
            return { success: false, error: 'IDENTITY ALREADY REGISTERED. IDENTITY OR CALLSIGN TAKEN.' };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        await db.insert(users).values({
            email,
            username,
            passwordHash,
            steamName: steamName || null,
            // Note: users table doesn't have gameName, but drivers table does. 
            // Usually we'd create a driver record later or store it in users if needed.
            // For now, let's keep it simple and just create the user.
            globalColor: '#e10600', // Default F1 red
        });

        return { success: true };
    } catch (err: any) {
        console.error('Registration error:', err);
        return { success: false, error: 'SYSTEM ERROR DURING UPLINK. TRY AGAIN LATER.' };
    }
}
