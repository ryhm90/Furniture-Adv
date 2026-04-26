import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT e.id, e.name AS employee_name, e.salary, p.payment_date
          FROM \`${dbName}\`.employees e
          LEFT JOIN \`${dbName}\`.payments_payroll p ON e.id = p.employee_id
        `,
        [],
      );

      return NextResponse.json(rows);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
