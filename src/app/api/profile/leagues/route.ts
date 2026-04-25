import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { drivers, leagues, teams } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Finde alle Driver des Users und prüfe dabei ob er Owner der Liga ist
        const userDrivers = await db.select({
            driverId: drivers.id,
            leagueId: drivers.leagueId,
            teamId: drivers.teamId,
            leagueName: leagues.name,
            isOwner: sql<boolean>`(${leagues.ownerId} = ${userId})`,
            teamsLocked: leagues.teamsLocked
        })
        .from(drivers)
        .innerJoin(leagues, eq(drivers.leagueId, leagues.id))
        .where(eq(drivers.userId, userId));

        const result = [];
        for (const row of userDrivers) {
            // Finde verfügbare Teams in dieser Liga
            const availableTeams = await db.select({
                id: teams.id,
                name: teams.name,
                color: teams.color
            })
            .from(teams)
            .where(eq(teams.leagueId, row.leagueId as string))
            .orderBy(teams.name);

            result.push({
                driverId: row.driverId,
                leagueId: row.leagueId,
                leagueName: row.leagueName,
                teamId: row.teamId,
                isAdmin: !!row.isOwner,
                isLocked: !!row.teamsLocked,
                availableTeams: availableTeams
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
        const valid = await db.select({
            id: drivers.id,
            teamsLocked: leagues.teamsLocked
        })
        .from(drivers)
        .innerJoin(leagues, eq(drivers.leagueId, leagues.id))
        .where(and(eq(drivers.id, driverId), eq(drivers.userId, userId)))
        .limit(1);

        if (valid.length === 0) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (valid[0].teamsLocked) {
            return NextResponse.json({ error: "Teams are locked by the administrator" }, { status: 403 });
        }

        if (!teamId || teamId.trim() === '') {
            await db.update(drivers)
                .set({ teamId: null, team: null })
                .where(eq(drivers.id, driverId));
        } else {
            await db.update(drivers)
                .set({ teamId: teamId, team: null })
                .where(eq(drivers.id, driverId));
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
