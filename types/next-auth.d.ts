import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/lib/auth-constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      sessionId: string;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    status?: UserStatus;
    sid?: string;
    ev?: string | null;
  }
}
