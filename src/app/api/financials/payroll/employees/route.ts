import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
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
      await ensurePayrollEmployeeColumns(db, dbName);

      const [rows] = await db.execute(
        `
          SELECT
            e.id,
            e.name,
            e.role,
            e.salary,
            e.hire_date,
            e.bonus,
            e.received,
            e.salary_advance,
            (e.salary - e.salary_advance) AS net_salary_due,
            (
              SELECT MAX(p.payment_date)
              FROM \`${dbName}\`.payments_payroll p
              WHERE p.employee_id = e.id
            ) AS last_payment_date
          FROM \`${dbName}\`.employees e
          WHERE e.is_active = 1
          ORDER BY e.hire_date DESC, e.id DESC
        `,
      );

      const response = NextResponse.json(rows);
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

    console.error("Error fetching employees:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorResponse = NextResponse.json({ error: errorMessage }, { status: 500 });
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}
