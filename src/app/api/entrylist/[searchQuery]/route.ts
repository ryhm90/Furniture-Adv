import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchQuery: string }> },
) {
  try {
    const session = await requireRole(["Manager", "DOCTOR"]);
    const dbName = getDbNameFromSession(session);
    const { searchQuery } = await params;
    const db = await pool.getConnection();

    try {
      let rows;

      if (searchQuery) {
        [rows] = await db.execute(
          `SELECT * FROM \`${dbName}\`.entrytable WHERE RoomName LIKE ? ORDER BY id DESC`,
          [`%${searchQuery}%`],
        );
      } else {
        rows = [];
      }

      return NextResponse.json(rows);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }
}
