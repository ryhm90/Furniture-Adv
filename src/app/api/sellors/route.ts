import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.query(
        `SELECT id, name FROM \`${dbName}\`.employees WHERE role = 'sellor'`,
      );
      return NextResponse.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching sellors:", error);
    return NextResponse.json({ error: "Error fetching sellors" }, { status: 500 });
  }
}
