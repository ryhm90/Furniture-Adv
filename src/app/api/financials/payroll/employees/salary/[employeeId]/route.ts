import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface EmployeeRow extends RowDataPacket {
  salary: number;
  salary_advance: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { employeeId } = await params;
    const db = await pool.getConnection();

    try {
      await ensurePayrollEmployeeColumns(db, dbName);

      const [rows] = await db.query<EmployeeRow[]>(
        `
          SELECT salary, salary_advance
          FROM \`${dbName}\`.employees
          WHERE id = ? AND is_active = 1
        `,
        [employeeId],
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          salary: Number(rows[0].salary ?? 0),
          salaryAdvance: Number(rows[0].salary_advance ?? 0),
        },
        { status: 200 },
      );
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json({ error: "Failed to fetch salary" }, { status: 500 });
  }
}
