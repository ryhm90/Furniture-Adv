import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const { sum, invonum } = await req.json();

    if (sum === undefined) {
      return NextResponse.json({ message: "Sum is required" }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type) VALUES (?, -?, ?)`,
      [invonum, sum, "Deleted Invoice"],
    );

    return NextResponse.json({ message: "Sum inserted into safebox" }, { status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
