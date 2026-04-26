import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface EmployeeRow extends RowDataPacket {
  id: number;
  bonus: number;
  received: number;
  salary_advance: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { employeeId } = await params;
    const { employeeName, role, hireDate, salary } = await request.json();

    if (!employeeName || !role || !hireDate || salary == null) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensurePayrollEmployeeColumns(db, dbName);

      const [existingRows] = await db.execute<EmployeeRow[]>(
        `SELECT id FROM \`${dbName}\`.employees WHERE id = ? AND is_active = 1`,
        [employeeId],
      );

      if (existingRows.length === 0) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      await db.execute(
        `
          UPDATE \`${dbName}\`.employees
          SET name = ?, role = ?, hire_date = ?, salary = ?
          WHERE id = ? AND is_active = 1
        `,
        [employeeName, role, hireDate, Number(salary), employeeId],
      );

      return NextResponse.json({ message: "Employee updated successfully" });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Failed to update employee:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { employeeId } = await params;
    const db = await pool.getConnection();

    try {
      await ensurePayrollEmployeeColumns(db, dbName);

      const [employees] = await db.execute<EmployeeRow[]>(
        `
          SELECT id, bonus, received, salary_advance
          FROM \`${dbName}\`.employees
          WHERE id = ? AND is_active = 1
        `,
        [employeeId],
      );

      if (employees.length === 0) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const employee = employees[0];
      if (
        Number(employee.bonus) > 0 ||
        Number(employee.received) > 0 ||
        Number(employee.salary_advance) > 0
      ) {
        return NextResponse.json(
          {
            error: "Please settle bonus, received balance, and salary advances before deleting.",
          },
          { status: 400 },
        );
      }

      await db.execute(
        `UPDATE \`${dbName}\`.employees SET is_active = 0 WHERE id = ? AND is_active = 1`,
        [employeeId],
      );

      return NextResponse.json({ message: "Employee deleted successfully" });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Failed to delete employee:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
