import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const main = searchParams.get("main");

    if (!main) {
      return NextResponse.json({ error: "Main subject is required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `
          SELECT Action
          FROM \`${dbName}\`.spendac
          WHERE main = ?
          ORDER BY Action ASC
        `,
        [main],
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { message: "No sub-subjects found for the selected main subject" },
          { status: 404 },
        );
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

    return NextResponse.json({ error: "Failed to fetch sub-subjects" }, { status: 500 });
  }
}
