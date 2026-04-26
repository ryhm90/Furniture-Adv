import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();
    const { date } = await params;
    const expenseSearch = request.nextUrl.searchParams.get("expenseSearch")?.trim() ?? "";
    const expenseSearchApplied = Boolean(expenseSearch);

    try {
      const [incomeRows] = await db.execute<RowDataPacket[]>(
        `
          SELECT
            id,
            details,
            MoneyPaid,
            type,
            name,
            DATE_FORMAT(COALESCE(\`date\`, created_at), '%Y-%m-%d') AS entryDate
          FROM \`${dbName}\`.safeboxiqd
          WHERE DATE(COALESCE(\`date\`, created_at)) = ?
            AND MoneyPaid > 0
          ORDER BY COALESCE(\`date\`, created_at) ASC, id ASC
        `,
        [date],
      );

      const [dailyExpenseRows] = await db.execute<RowDataPacket[]>(
        `
          SELECT
            id,
            details,
            MoneyPaid,
            type,
            name,
            DATE_FORMAT(COALESCE(\`date\`, created_at), '%Y-%m-%d') AS entryDate
          FROM \`${dbName}\`.safeboxiqd
          WHERE DATE(COALESCE(\`date\`, created_at)) = ?
            AND MoneyPaid < 0
          ORDER BY COALESCE(\`date\`, created_at) ASC, id ASC
        `,
        [date],
      );

      let expenseRows = dailyExpenseRows;

      if (expenseSearchApplied) {
        const wildcardSearch = `%${expenseSearch}%`;
        const [matchedExpenseRows] = await db.execute<RowDataPacket[]>(
          `
            SELECT
              id,
              details,
              MoneyPaid,
              type,
              name,
              DATE_FORMAT(COALESCE(\`date\`, created_at), '%Y-%m-%d') AS entryDate
            FROM \`${dbName}\`.safeboxiqd
            WHERE MoneyPaid < 0
              AND (details LIKE ? OR name LIKE ?)
            ORDER BY COALESCE(\`date\`, created_at) DESC, id DESC
          `,
          [wildcardSearch, wildcardSearch],
        );
        expenseRows = matchedExpenseRows;
      }

      const [sumResult] = await db.execute<RowDataPacket[]>(
        `SELECT SUM(MoneyPaid) AS totalMoneyPaid FROM \`${dbName}\`.safeboxiqd`,
        [],
      );

      return NextResponse.json({
        incomeRows,
        expenseRows,
        dailyExpenseRows,
        payments: [...incomeRows, ...expenseRows],
        totalMoneyPaid: sumResult[0]?.totalMoneyPaid || 0,
        expenseSearchApplied,
        expenseSearchMode: expenseSearchApplied ? "global" : "date",
        expenseSearchTerm: expenseSearch,
      });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
