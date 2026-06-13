import type { DefaultSession } from "next-auth";
import type { UserRole } from "./model";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}
