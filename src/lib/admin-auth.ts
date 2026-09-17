"use server";

import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '009981';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'f1_app_admin_secret_009981_production';
const COOKIE_NAME = 'f1_admin_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function createSignature(payload: string): string {
    return crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
}

export async function verifyAdminPasscode(passcode: string): Promise<{ success: boolean; error?: string }> {
    if (!passcode || passcode.trim() !== ADMIN_PASSCODE) {
        return { success: false, error: 'INVALID ACCESS CODE' };
    }

    const exp = Date.now() + SEVEN_DAYS_MS;
    const payload = `admin:${exp}`;
    const sig = createSignature(payload);
    const token = `${payload}:${sig}`;

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
    });

    return { success: true };
}

export async function isAdminAuthenticated(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const cookie = cookieStore.get(COOKIE_NAME);
        if (!cookie?.value) return false;

        const parts = cookie.value.split(':');
        if (parts.length !== 3) return false;

        const [role, expStr, sig] = parts;
        if (role !== 'admin') return false;

        const exp = parseInt(expStr, 10);
        if (isNaN(exp) || Date.now() > exp) return false;

        const expectedSig = createSignature(`${role}:${expStr}`);
        if (sig.length !== expectedSig.length) return false;
        
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
    } catch (e) {
        return false;
    }
}

export async function logoutAdmin(): Promise<{ success: boolean }> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return { success: true };
}
