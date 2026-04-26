import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface UpdateData {
  InvoNum: string;
  name: string | null;
  type: string;
}

const ALLOWED_FIELDS: Record<string, string> = {
  Driver: "Driver",
  CarNam: "CarNam",
  Time: "Time",
  warehouseS: "warehouseS",
};

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const body: UpdateData = await request.json();
    const { InvoNum, name, type } = body;
    const column = ALLOWED_FIELDS[type];

    if (!InvoNum) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    if (!column) {
      return NextResponse.json({ error: "Invalid update field" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [result] = await db.execute(
        `UPDATE \`${dbName}\`.sellmoney SET ${column} = ? WHERE InvoNum = ?`,
        [name, InvoNum],
      );

      if ((result as any).affectedRows === 0) {
        return NextResponse.json(
          { error: "Invoice not found or data already updated." },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: "Data updated successfully." });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error updating sellmoney table:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
