import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

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
                const users = await query<any>("SELECT * FROM users WHERE username = ? LIMIT 1", [credentials.username]);
                
                if (users.length === 0) {
                    // Try case insensitive fallback if exact match doesn't work right away
                    const usersFallback = await query<any>("SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1", [credentials.username]);
                    if (usersFallback.length === 0) return null;
                    users[0] = usersFallback[0];
                }

                const user = users[0];
                const isValid = await bcrypt.compare(credentials.password, user.password_hash);

                if (!isValid) {
                    return null;
                }

                // Return payload for JWT token
                return {
                    id: user.id,
                    email: user.email,
                    name: user.username,        // Using username as name
                    image: user.avatar_url,
                    steamName: user.steam_name,
                    globalColor: user.global_color
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
        
        // signIn: '/login'
    },
    secret: process.env.NEXTAUTH_SECRET || "F1APP_SUPER_SECRET_KEY_123!"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
