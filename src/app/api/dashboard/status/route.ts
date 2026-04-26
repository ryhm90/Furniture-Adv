import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireSession,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const CANCELED_STATUS = "ملغى";
const NOT_PREPARED_STATUS = "غير مجهز";
const PREPARED_STATUS = "مجهز";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const today = new Date().toLocaleDateString("en-CA");

      const [sales]: any[] = await db.execute(
        `
          SELECT
            COUNT(*) AS count,
            COALESCE(SUM(MoneyRemain), 0) AS remainingAmount
          FROM \`${dbName}\`.sellmoney
          WHERE DATE(created_at) = ?
            AND Por <> ?
        `,
        [today, CANCELED_STATUS],
      );

      const [provideToday]: any[] = await db.execute(
        `
          SELECT COUNT(*) AS count
          FROM \`${dbName}\`.sellmoney
          WHERE DATE(Provide) = ?
            AND Por <> ?
        `,
        [today, CANCELED_STATUS],
      );

      const [notPreparedAll]: any[] = await db.execute(
        `
          SELECT COUNT(*) AS count
          FROM \`${dbName}\`.sellmoney
          WHERE warehouseS = ?
            AND Por <> ?
        `,
        [NOT_PREPARED_STATUS, CANCELED_STATUS],
      );

      const [preparedToday]: any[] = await db.execute(
        `
          SELECT COUNT(*) AS count
          FROM \`${dbName}\`.sellmoney
          WHERE warehouseS = ?
            AND DATE(Provide) = ?
            AND Por <> ?
        `,
        [PREPARED_STATUS, today, CANCELED_STATUS],
      );

      return NextResponse.json({
        salescount: Number(sales[0]?.count || 0),
        providecount: Number(provideToday[0]?.count || 0),
        provideallcount: Number(notPreparedAll[0]?.count || 0),
        preparedTodayCount: Number(preparedToday[0]?.count || 0),
        remainingAmountToday: Number(sales[0]?.remainingAmount || 0),
      });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching dashboard status:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
