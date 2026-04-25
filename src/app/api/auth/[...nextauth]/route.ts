import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users as usersTable } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "Markus Lanz" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials: Record<"username" | "password", string> | undefined) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                // Username abfragen
                const users = await db.select().from(usersTable).where(eq(usersTable.username, credentials.username)).limit(1);
                
                if (users.length === 0) {
                    // Try case insensitive fallback if exact match doesn't work right away
                    const usersFallback = await db.select().from(usersTable).where(sql`LOWER(${usersTable.username}) = LOWER(${credentials.username})`).limit(1);
                    if (usersFallback.length === 0) return null;
                    users[0] = usersFallback[0];
                }

                const user = users[0];
                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isValid) {
                    return null;
                }

                // Return payload for JWT token
                return {
                    id: user.id,
                    email: user.email,
                    name: user.username,        // Using username as name
                    image: user.avatarUrl,
                    steamName: user.steamName,
                    globalColor: user.globalColor
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 Tage
    },
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            // Nach dem Login wird JWT mit User-ID und custom fields befüllt
            if (user) {
                token.sub = user.id;
                token.steamName = (user as any).steamName;
                token.globalColor = (user as any).globalColor;
            }
            // Update session if user changes values via frontend
            if (trigger === "update" && session) {
                token.picture = session.image || token.picture;
                token.name = session.name || token.name;
                token.steamName = session.steamName || token.steamName;
                token.globalColor = session.globalColor || token.globalColor;
            }
            return token;
        },
        async session({ session, token }: any) {
            // Die Custom Fields in der finalen User-Session (Client-Side) bereitstellen
            if (session.user && token) {
                (session.user as any).id = token.sub;
                (session.user as any).steamName = token.steamName;
                (session.user as any).globalColor = token.globalColor;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login'
    },
    secret: process.env.NEXTAUTH_SECRET || "F1APP_SUPER_SECRET_KEY_123!"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
