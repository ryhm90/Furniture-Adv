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
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [data] = await db.execute(
        `
          SELECT
            Name_ID,
            Name,
            type,
            COALESCE(SUM(Inn), 0) AS TotalIn,
            COALESCE(SUM(\`Out\`), 0) AS TotalOut,
            COALESCE(SUM(Inn), 0) - COALESCE(SUM(\`Out\`), 0) AS Balance,
            COUNT(*) AS movementsCount,
            DATE_FORMAT(MAX(dateIssued), '%Y-%m-%d') AS lastMovementDate
          FROM \`${dbName}\`.payments
          GROUP BY Name_ID, Name, type
          ORDER BY Name ASC
        `,
      );

      const response = NextResponse.json(data);
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching provider details:", error);
    const errorResponse = NextResponse.json(
      { error: "An error occurred while fetching provider details." },
      { status: 500 },
    );
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}
