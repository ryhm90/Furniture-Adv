import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `SELECT ID, Name FROM \`${dbName}\`.carpenter WHERE flag = '1' ORDER BY Name ASC`,
      );
      return NextResponse.json(rows);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching carpenters:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
