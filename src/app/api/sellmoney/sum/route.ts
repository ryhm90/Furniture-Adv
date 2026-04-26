import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(req.url);
    const invoNum = searchParams.get("invonum");

    if (!invoNum) {
      return NextResponse.json({ message: "Invoice number is required" }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      `SELECT warehouseS, MoneyPaid AS sum FROM \`${dbName}\`.sellmoney WHERE InvoNum = ?`,
      [invoNum],
    );

    return NextResponse.json({ sum: rows[0]?.sum || 0 }, { status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
