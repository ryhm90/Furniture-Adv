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
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const { searchQuery } = await params;
    const db = await pool.getConnection();

    try {
      let rows;

      if (searchQuery) {
        [rows] = await db.execute(
          `
            SELECT id, RoomName, RoomCounts, flagf, RoomCost
            FROM \`${dbName}\`.entrytable
            WHERE RoomName LIKE ? OR Namee LIKE ?
            ORDER BY id DESC
          `,
          [`%${searchQuery}%`, `%${searchQuery}%`],
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
