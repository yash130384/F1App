import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, run } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Finde alle Driver des Users und prüfe dabei ob er Owner der Liga ist
        const drivers = await query<any>(`
            SELECT d.id as driver_id, d.league_id, d.team_id, l.name as league_name, (l.owner_id = ?) as is_owner, l.teams_locked
            FROM drivers d
            JOIN leagues l ON d.league_id = l.id
            WHERE d.user_id = ?
        `, [userId, userId]);

        const result = [];
        for (const row of drivers) {
            // Finde verfügbare Teams in dieser Liga
            const teams = await query<any>(`SELECT id, name, color FROM teams WHERE league_id = ? ORDER BY name ASC`, [row.league_id]);
            result.push({
                driverId: row.driver_id,
                leagueId: row.league_id,
                leagueName: row.league_name,
                teamId: row.team_id,
                isAdmin: !!row.is_owner,
                isLocked: !!row.teams_locked,
                availableTeams: teams
            });
        }

        return NextResponse.json({ success: true, leagues: result });
    } catch (e: any) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const driverId = url.searchParams.get("driverId");
        const teamId = url.searchParams.get("teamId"); // empty string if free agent
        const userId = (session.user as any).id;

        if (!driverId) {
             return NextResponse.json({ error: "Missing driver ID" }, { status: 400 });
        }

        // Sicherstellen dass der Driver zum einloggten User gehört UND ob die Liga gesperrt ist
        const valid = await query<any>(`
            SELECT d.id, l.teams_locked 
            FROM drivers d 
            JOIN leagues l ON d.league_id = l.id 
            WHERE d.id = ? AND d.user_id = ?
        `, [driverId, userId]);

        if (valid.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (valid[0].teams_locked) {
            return NextResponse.json({ error: "Teams are locked by the administrator" }, { status: 403 });
        }

        if (!teamId || teamId.trim() === '') {
            await run("UPDATE drivers SET team_id = NULL WHERE id = ?", [driverId]);
        } else {
            await run("UPDATE drivers SET team_id = ? WHERE id = ?", [teamId, driverId]);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
