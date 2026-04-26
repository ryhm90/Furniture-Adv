import { compare } from "bcryptjs";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";

interface UserRow extends RowDataPacket {
  id: string | number;
  email: string;
  password: string;
  name: string | null;
  role: string | null;
  database: string | null;
  pageName: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  database: string | null;
  pageName: string | null;
}

export class AuthenticationUnavailableError extends Error {
  constructor(message = "Authentication service is unavailable") {
    super(message);
    this.name = "AuthenticationUnavailableError";
  }
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  let db: PoolConnection | undefined;

  try {
    db = await pool.getConnection();
    const query =
      "SELECT id, email, password, name, role, `database`, pageName FROM user WHERE email = ? LIMIT 1";
    const [rows] = await db.execute<UserRow[]>(query, [email]);

    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];
    const isMatch = await compare(password, user.password);

    if (!isMatch) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      database: user.database,
      pageName: user.pageName,
    };
  } catch (error) {
    console.error("authenticateUser failed:", error);
    throw new AuthenticationUnavailableError();
  } finally {
    db?.release();
  }
}
