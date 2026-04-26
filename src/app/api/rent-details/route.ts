import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

interface RentRow extends RowDataPacket {
  details: string;
  amountSpent: number;
  entryDate: string | null;
  entriesCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const month = request.nextUrl.searchParams.get("month")?.trim();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Valid month is required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute<RentRow[]>(
        `
          SELECT
            details,
            ABS(SUM(MoneyPaid)) AS amountSpent,
            DATE_FORMAT(MAX(COALESCE(\`date\`, created_at)), '%Y-%m-%d') AS entryDate,
            COUNT(*) AS entriesCount
          FROM \`${dbName}\`.safeboxiqd
          WHERE DATE_FORMAT(COALESCE(\`date\`, created_at), '%Y-%m') = ?
            AND type = 'Rent Record'
          GROUP BY details
          ORDER BY MAX(COALESCE(\`date\`, created_at)) DESC, details ASC
        `,
        [month],
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

    console.error("Error fetching rent details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
