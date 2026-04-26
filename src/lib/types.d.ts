// src/lib/types.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

// 1) Extend the built-in types for the session, user, and/or JWT:

declare module "next-auth" {
  /** 
   * Example: we extend DefaultUser, 
   * adding optional fields `role` and `database`.
   */
  interface User extends DefaultUser {
    role?: string;
    database?: string;
    pageName?: string;
  }

  /** 
   * If you need the session.user to have these fields, 
   * extend the session interface as well:
   */
  interface Session {
    user?: {
      /** The user's DB PK (already provided by NextAuth but you can override) */
      id?: string;
      email?: string | null;
      name?: string | null;
      role?: string | null;
      database?: string | null;
      pageName?:  string | null;
      // ... add any other fields you need
    } & DefaultSession["user"];
  }
}

// 2) Extend the JWT interface if you're storing extra data in it:
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    database?: string;
    pageName?: string;
    // add anything else you need
  }
}
