import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "\u0641\u064A \u0627\u0644\u062A\u0635\u0646\u064A\u0639",
  "\u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642",
  "\u0645\u0633\u062A\u0644\u0645\u0629",
  "\u0645\u062F\u062E\u0644\u0629",
];

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || "All";
    const rawStatus = searchParams.get("status");
    const status = rawStatus && rawStatus !== "all" ? rawStatus : null;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values are: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      const conditions: string[] = [];
      const values: Array<string | number> = [];

      if (providerId !== "All") {
        conditions.push("ID_providor = ?");
        values.push(providerId);
      }

      if (status) {
        conditions.push("status = ?");
        values.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const [data] = await db.execute(
        `SELECT * FROM \`${dbName}\`.providorsde ${whereClause} ORDER BY date DESC`,
        values,
      );

      return NextResponse.json(data);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching provider details:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching provider details." },
      { status: 500 },
    );
  }
}
