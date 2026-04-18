import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      steamName?: string | null;
      avatarUrl?: string | null;
      globalColor?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id?: string;
    steamName?: string | null;
    avatarUrl?: string | null;
    globalColor?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    steamName?: string | null;
    avatarUrl?: string | null;
    globalColor?: string | null;
  }
}
