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
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [carpenters]: any[] = await db.execute(
        `SELECT Name FROM \`${dbName}\`.carpenter WHERE flag = '1'`,
        [],
      );
      const [drivers]: any[] = await db.execute(
        `SELECT Name FROM \`${dbName}\`.driver WHERE flag = '1'`,
        [],
      );

      const response = NextResponse.json({
        carpenterNames: carpenters.map((row: { Name: string }) => row.Name),
        driverNames: drivers.map((row: { Name: string }) => row.Name),
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

    const errorResponse = NextResponse.json(
      { error: "An error occurred while fetching data" },
      { status: 500 },
    );
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}
