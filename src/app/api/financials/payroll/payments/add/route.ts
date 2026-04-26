import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import { ensurePayrollEmployeeColumns } from "@/lib/payrollEmployees";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface LastPaymentRow extends RowDataPacket {
  lastPaymentDate: string | null;
}

interface PaymentExistsRow extends RowDataPacket {
  id: number;
}

interface EmployeeSalaryRow extends RowDataPacket {
  salary: number;
  name: string;
  salary_advance: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    let { employeeId, deduction } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
    }

    deduction = deduction || 0;
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();
      await ensurePayrollEmployeeColumns(db, dbName);

      const [lastPayment] = await db.execute<LastPaymentRow[]>(
        `
          SELECT MAX(payment_date) AS lastPaymentDate
          FROM \`${dbName}\`.payments_payroll
          WHERE employee_id = ?
        `,
        [employeeId],
      );

      let paymentDate: Date;
      if (lastPayment.length > 0 && lastPayment[0].lastPaymentDate) {
        paymentDate = new Date(lastPayment[0].lastPaymentDate);
        paymentDate.setMonth(paymentDate.getMonth() + 1);
      } else {
        paymentDate = new Date();
      }

      const year = paymentDate.getFullYear();
      const month = paymentDate.getMonth() + 1;

      const [existingPayment] = await db.execute<PaymentExistsRow[]>(
        `
          SELECT id
          FROM \`${dbName}\`.payments_payroll
          WHERE employee_id = ? AND year = ? AND month = ?
        `,
        [employeeId, year, month],
      );

      if (existingPayment.length > 0) {
        await db.rollback();
        return NextResponse.json(
          { error: "Payment for this month already exists" },
          { status: 400 },
        );
      }

      const [employee] = await db.execute<EmployeeSalaryRow[]>(
        `
          SELECT salary, name, salary_advance
          FROM \`${dbName}\`.employees
          WHERE id = ? AND is_active = 1
          FOR UPDATE
        `,
        [employeeId],
      );

      if (employee.length === 0) {
        await db.rollback();
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const salary = Number(employee[0].salary);
      const name = employee[0].name;
      const advanceDeduction = Number(employee[0].salary_advance ?? 0);
      const manualDeduction = Number(deduction);
      const totalDeduction = advanceDeduction + manualDeduction;

      if (totalDeduction > salary) {
        await db.rollback();
        return NextResponse.json(
          { error: "Total deductions exceed salary" },
          { status: 400 },
        );
      }

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.payments_payroll (
            employee_id,
            salary,
            salary_deduction,
            payment_date,
            year,
            month
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          employeeId,
          salary,
          totalDeduction,
          paymentDate.toLocaleDateString("en-CA"),
          year,
          month,
        ],
      );

      const finalSalary = salary - totalDeduction;

      if (advanceDeduction > 0) {
        await db.execute(
          `UPDATE \`${dbName}\`.employees SET salary_advance = 0 WHERE id = ? AND is_active = 1`,
          [employeeId],
        );
      }

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name)
          VALUES (?, -?, ?, ?)
        `,
        ["Salary", finalSalary, "Payroll", name],
      );

      await db.commit();
      return NextResponse.json({
        message: "Payment added successfully",
        finalSalary,
        advanceDeduction,
        manualDeduction,
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

    console.error(error);
    return NextResponse.json({ error: "Failed to add payment" }, { status: 500 });
  }
}
