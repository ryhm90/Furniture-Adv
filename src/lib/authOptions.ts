import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  AuthenticationUnavailableError,
  authenticateUser,
} from "@/lib/authenticateUser";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        try {
          const { email, password } = await signInSchema.parseAsync(credentials);
          const user = await authenticateUser(email, password);

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role ?? undefined,
            database: user.database ?? undefined,
            pageName: user.pageName ?? undefined,
          };
        } catch (error) {
          if (error instanceof AuthenticationUnavailableError) {
            throw new Error("Authentication service unavailable");
          }

          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role ?? undefined;
        token.database = user.database ?? undefined;
        token.pageName = user.pageName ?? undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as string | undefined) ?? undefined;
        session.user.database = (token.database as string | undefined) ?? undefined;
        session.user.pageName = (token.pageName as string | undefined) ?? undefined;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url === `${baseUrl}/`) {
        return baseUrl;
      }

      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
