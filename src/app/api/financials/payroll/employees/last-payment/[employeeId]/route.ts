import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { employeeId } = await params;
    const [rows]: any[] = await pool.query(
      `
        SELECT MAX(payment_date) AS lastPaymentDate
        FROM \`${dbName}\`.payments_payroll
        WHERE employee_id = ?
      `,
      [employeeId],
    );

    if (rows.length === 0 || !rows[0].lastPaymentDate) {
      return NextResponse.json({ error: "No previous payment found" }, { status: 404 });
    }

    return NextResponse.json({ lastPaymentDate: rows[0].lastPaymentDate }, { status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json({ error: "Failed to fetch last payment date" }, { status: 500 });
  }
}
