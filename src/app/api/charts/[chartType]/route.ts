import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chartType: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { chartType } = await params;
    const { filters } = await request.json();

    if (!chartType || !filters) {
      return NextResponse.json(
        { error: "Invalid chartType or filters." },
        { status: 400 },
      );
    }

    const { period, startDate, endDate } = filters;
    if (!period) {
      return NextResponse.json(
        { error: "Missing period (daily, monthly, yearly)." },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      let query = "";
      const sqlParams: any[] = [];
      let selectLabel = "";
      let groupByClause = "";
      let orderByClause = "";

      if (period === "daily") {
        selectLabel = "DATE(created_at)";
        groupByClause = "GROUP BY DATE(created_at)";
        orderByClause = "DATE(created_at)";
      } else if (period === "monthly") {
        selectLabel = "CONCAT(YEAR(created_at), '-', MONTH(created_at))";
        groupByClause = "GROUP BY YEAR(created_at), MONTH(created_at)";
        orderByClause = "YEAR(created_at), MONTH(created_at)";
      } else if (period === "yearly") {
        selectLabel = "YEAR(created_at)";
        groupByClause = "GROUP BY YEAR(created_at)";
        orderByClause = "YEAR(created_at)";
      } else {
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
      }

      switch (chartType) {
        case "sales":
          query = `
            SELECT
              ${selectLabel} AS label,
              SUM(\`sum\`) AS value1
            FROM \`${dbName}\`.sellmoney
            WHERE Por <> 'ملغى'
              AND created_at BETWEEN ? AND ?
            ${groupByClause}
            ORDER BY ${orderByClause} ASC
          `;
          sqlParams.push(startDate, endDate);
          break;
        case "expenses":
          query = `
            SELECT
              ${selectLabel} AS label,
              ABS(SUM(MoneyPaid)) AS value1
            FROM \`${dbName}\`.safeboxiqd
            WHERE MoneyPaid < 0
              AND created_at BETWEEN ? AND ?
            ${groupByClause}
            ORDER BY ${orderByClause} ASC
          `;
          sqlParams.push(startDate, endDate);
          break;
        case "comparative": {
          const salesSubQuery = `
            SELECT
              ${selectLabel} AS salesLabel,
              SUM(\`sum\`) AS totalSales
            FROM \`${dbName}\`.sellmoney
            WHERE Por <> 'ملغى'
              AND created_at BETWEEN ? AND ?
            ${groupByClause}
          `;

          const expensesSubQuery = `
            SELECT
              ${selectLabel} AS expLabel,
              ABS(SUM(MoneyPaid)) AS totalExpenses
            FROM \`${dbName}\`.safeboxiqd
            WHERE MoneyPaid < 0
              AND created_at BETWEEN ? AND ?
            ${groupByClause}
          `;

          query = `
            WITH all_dates AS (
              SELECT salesLabel AS label FROM (${salesSubQuery}) AS s
              UNION
              SELECT expLabel AS label FROM (${expensesSubQuery}) AS e
            ),
            sales_cte AS (${salesSubQuery}),
            expenses_cte AS (${expensesSubQuery})
            SELECT
              ad.label,
              COALESCE(sales_cte.totalSales, 0) AS value1,
              COALESCE(expenses_cte.totalExpenses, 0) AS value2
            FROM all_dates ad
            LEFT JOIN sales_cte ON ad.label = sales_cte.salesLabel
            LEFT JOIN expenses_cte ON ad.label = expenses_cte.expLabel
            ORDER BY ad.label
          `;

          sqlParams.push(
            startDate,
            endDate,
            startDate,
            endDate,
            startDate,
            endDate,
            startDate,
            endDate,
          );
          break;
        }
        case "TIAR":
          query = `
            SELECT
              ${selectLabel} AS label,
              SUM(RoomCost * RoomCounts) AS value1
            FROM \`${dbName}\`.entrytable
            WHERE created_at BETWEEN ? AND ?
            ${groupByClause}
            ORDER BY ${orderByClause} ASC
          `;
          sqlParams.push(startDate, endDate);
          break;
        default:
          return NextResponse.json({ error: "Unknown chart type" }, { status: 400 });
      }

      const [rows] = await db.execute(query, sqlParams);
      return NextResponse.json(rows, { status: 200 });
    } finally {
      await db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error generating chart data:", error);
    return NextResponse.json(
      { error: "An error occurred while generating chart data. Please try again later." },
      { status: 500 },
    );
  }
}
