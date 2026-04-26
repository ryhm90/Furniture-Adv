import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ history: [] }, { status: 400 });
    }

    const conn = await pool.getConnection();

    try {
      const [rows] = await conn.query(
        `
          SELECT name, amount, Created_at, state, details
          FROM \`${dbName}\`.dept
          WHERE name = ?
          ORDER BY Created_at DESC
        `,
        [name],
      );

      return NextResponse.json({ history: rows }, { status: 200 });
    } finally {
      conn.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("DB error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
