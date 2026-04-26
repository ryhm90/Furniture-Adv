import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface FinancialReport {
  total_income: number;
  total_expenses: number;
}

export const dynamic = "force-dynamic";

async function executeQuery(query: string, values: any[]): Promise<FinancialReport[]> {
  const db = await pool.getConnection();
  try {
    const [result] = await db.execute(query, values);
    return result as FinancialReport[];
  } finally {
    db.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    const [rows] = await executeQuery(
      `
        SELECT
          SUM(receiptCost) AS total_income,
          SUM(expenseAmount) AS total_expenses
        FROM \`${dbName}\`.invoices
        WHERE invoiceDate BETWEEN ? AND ?
      `,
      [startDate, endDate],
    );

    return NextResponse.json(rows);
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
