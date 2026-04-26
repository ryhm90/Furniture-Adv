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
    const { pathname } = new URL(request.url);
    const providorId = pathname.split("/").pop();

    if (!providorId) {
      return NextResponse.json({ error: "Providor ID is required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM \`${dbName}\`.providorsde WHERE ID = ?`,
        [providorId],
      );

      if (rows.length === 0) {
        return NextResponse.json({ message: "Providor not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching providor details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
