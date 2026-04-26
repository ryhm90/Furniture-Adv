import { NextRequest, NextResponse } from "next/server";

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
    const db = await pool.getConnection();

    try {
      const url = new URL(request.url);
      const selectedProviderID = url.searchParams.get("providerId");
      const type = url.searchParams.get("type");

      const [rows] = await db.execute(
        `
          SELECT Name_ID, Name, type, Inn, \`Out\`, status, Details, dateIssued
          FROM \`${dbName}\`.payments
          WHERE Name_ID = ? AND type = ?
          ORDER BY dateIssued ASC
        `,
        [selectedProviderID, type],
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

    console.error("Error fetching provider payments data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
