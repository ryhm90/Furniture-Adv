import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface PaymentRequest {
  details: string;
  moneyPaid: number;
  type: string;
  workerName: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const { details, moneyPaid, type, workerName }: PaymentRequest = await req.json();

    if (!details || !moneyPaid || !type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const [insertResult]: any = await pool.query(
      `
        INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name)
        VALUES (?, -?, ?, ?)
      `,
      [details, moneyPaid, type, workerName],
    );

    if (insertResult.affectedRows === 0) {
      return NextResponse.json({ message: "Failed to record payment" }, { status: 400 });
    }

    return NextResponse.json({ message: "Payment recorded successfully" }, { status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
