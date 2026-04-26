import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const CANCELED_STATUS = "\u0645\u0644\u063A\u0649";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const affiliate = searchParams.get("ClName");

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate name is required." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT ID, InvoNum, InvoNum, MoneyPaid, MoneyRemain, Sum, created_at
          FROM \`${dbName}\`.sellmoney
          WHERE wholesale = 'Y' AND ClName = ? AND MoneyRemain <> 0 AND Por <> ?
        `,
        [affiliate, CANCELED_STATUS],
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

    console.error("Error fetching sellmoney data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
