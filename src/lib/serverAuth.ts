import type { Session } from "next-auth";
import { NextResponse } from "next/server";

import { auth } from "@/auth";

export type SessionWithUser = Session & {
  user: NonNullable<Session["user"]>;
};

export class AuthorizationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

const normalizeRole = (role?: string | null) => role?.trim().toLowerCase() ?? "";

export function hasRole(role: string | null | undefined, allowedRoles: string[]) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

export async function requireSession(): Promise<SessionWithUser> {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError(401, "Unauthorized");
  }

  return session as SessionWithUser;
}

export async function requireRole(allowedRoles: string[]): Promise<SessionWithUser> {
  const session = await requireSession();

  if (!hasRole(session.user.role, allowedRoles)) {
    throw new AuthorizationError(403, "Forbidden");
  }

  return session;
}

export function getDbNameFromSession(session: SessionWithUser): string {
  const dbName = session.user.database?.trim();

  if (!dbName) {
    throw new AuthorizationError(403, "No database assigned to user");
  }

  return dbName;
}

export function toAuthorizationResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return null;
}
