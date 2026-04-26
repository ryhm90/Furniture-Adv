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
      const [rows] = await db.execute(`
        SELECT Name, SUM(Amount) AS Amount
        FROM \`${dbName}\`.dept
        GROUP BY Name
        ORDER BY Name ASC
      `);

      const [rows2] = await db.execute(`
        SELECT COALESCE(SUM(MoneyPaid), 0) AS totalMoneyPaid
        FROM \`${dbName}\`.safeboxiqd
      `);

      const response = NextResponse.json({
        deptData: rows,
        safeboxData: rows2,
      });
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

    console.error("Error fetching data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorResponse = NextResponse.json({ error: errorMessage }, { status: 500 });
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}
