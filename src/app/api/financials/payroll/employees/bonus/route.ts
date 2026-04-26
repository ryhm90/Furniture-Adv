import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface EmployeeBonusRow extends RowDataPacket {
  bonus: number;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { selectedEmployeeId } = await req.json();

    if (!selectedEmployeeId) {
      return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [employee] = await db.execute<EmployeeBonusRow[]>(
        `SELECT bonus, name FROM \`${dbName}\`.employees WHERE id = ? FOR UPDATE`,
        [selectedEmployeeId],
      );

      if (employee.length === 0) {
        await db.rollback();
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const bonus = Number(employee[0].bonus);
      const name = employee[0].name;

      if (bonus <= 0) {
        await db.rollback();
        return NextResponse.json({ error: "No pending bonus found" }, { status: 400 });
      }

      await db.execute(`UPDATE \`${dbName}\`.employees SET bonus = 0 WHERE id = ?`, [
        selectedEmployeeId,
      ]);
      await db.execute(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name)
          VALUES (?, -?, ?, ?)
        `,
        ["Bonus", bonus, "Payroll", name],
      );

      await db.commit();
      return NextResponse.json({ message: "Payment added successfully" });
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
