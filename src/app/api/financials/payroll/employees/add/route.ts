import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { employeeName, role, hireDate, salary } = await request.json();

    if (!employeeName || !role || !hireDate || salary == null) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensurePayrollEmployeeColumns(db, dbName);
      await db.execute(
        `
          INSERT INTO \`${dbName}\`.employees (
            name,
            role,
            hire_date,
            salary,
            bonus,
            received,
            salary_advance,
            is_active
          )
          VALUES (?, ?, ?, ?, 0, 0, 0, 1)
        `,
        [employeeName, role, hireDate, Number(salary)],
      );

      return NextResponse.json({ message: "Employee added successfully" });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Failed to add employee:", error);
    return NextResponse.json({ error: "Failed to add employee" }, { status: 500 });
  }
}
