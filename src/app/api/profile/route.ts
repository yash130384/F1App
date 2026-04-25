import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { users, drivers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { steamName, globalColor, avatarUrl } = body;
        const userId = (session.user as any).id;

        // Update the users table
        await db.update(users)
            .set({ 
                steamName: steamName, 
                globalColor: globalColor, 
                avatarUrl: avatarUrl 
            })
            .where(eq(users.id, userId));

        // Update drivers table (sync values down to all specific league driver profiles)
        await db.update(drivers)
            .set({ 
                gameName: steamName, 
                color: globalColor 
            })
            .where(eq(drivers.userId, userId));

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
