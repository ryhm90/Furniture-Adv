import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface EmployeeAdvanceRow extends RowDataPacket {
  salary: number;
  name: string;
  salary_advance: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { employeeId, amount, notes, advanceDate } = await request.json();

    if (!employeeId || amount == null) {
      return NextResponse.json({ error: "Employee id and amount are required" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Advance amount must be greater than zero" }, { status: 400 });
    }

    const normalizedNotes = typeof notes === "string" ? notes.trim() : "";
    const normalizedAdvanceDate =
      typeof advanceDate === "string" && advanceDate.trim()
        ? advanceDate.trim()
        : new Date().toLocaleDateString("en-CA");

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();
      await ensurePayrollEmployeeColumns(db, dbName);

      const [employees] = await db.execute<EmployeeAdvanceRow[]>(
        `
          SELECT salary, name, salary_advance
          FROM \`${dbName}\`.employees
          WHERE id = ? AND is_active = 1
          FOR UPDATE
        `,
        [employeeId],
      );

      if (employees.length === 0) {
        await db.rollback();
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const employee = employees[0];
      const currentAdvance = Number(employee.salary_advance ?? 0);
      const salary = Number(employee.salary ?? 0);
      const updatedAdvance = currentAdvance + numericAmount;

      if (updatedAdvance > salary) {
        await db.rollback();
        return NextResponse.json(
          { error: "Total salary advances cannot exceed the monthly salary" },
          { status: 400 },
        );
      }

      await db.execute(
        `UPDATE \`${dbName}\`.employees SET salary_advance = ? WHERE id = ? AND is_active = 1`,
        [updatedAdvance, employeeId],
      );

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name, date)
          VALUES (?, -?, ?, ?, ?)
        `,
        [
          normalizedNotes ? `Salary advance - ${normalizedNotes}` : "Salary advance",
          numericAmount,
          "Payroll",
          employee.name,
          normalizedAdvanceDate,
        ],
      );

      await db.commit();
      return NextResponse.json({
        message: "Salary advance added successfully",
        salaryAdvance: updatedAdvance,
      });
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Failed to add salary advance:", error);
    return NextResponse.json({ error: "Failed to add salary advance" }, { status: 500 });
  }
}
