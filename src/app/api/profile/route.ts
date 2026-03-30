import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { run } from "@/lib/db";

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
        await run(
            `UPDATE users SET steam_name = ?, global_color = ?, avatar_url = ? WHERE id = ?`,
            [steamName, globalColor, avatarUrl, userId]
        );

        // Update drivers table (sync values down to all specific league driver profiles)
        await run(
            `UPDATE drivers SET game_name = ?, color = ? WHERE user_id = ?`,
            [steamName, globalColor, userId]
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
