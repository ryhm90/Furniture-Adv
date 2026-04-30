import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const WHOLESALE_FLAG = "Y";
const CANCELLED_STATUS = "ملغى";
const READY_STATUS = "جهزت";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const driverName = new URL(request.url).searchParams.get("driver")?.trim();

    if (!driverName || driverName === "Null") {
      return NextResponse.json(
        { error: "Driver name is required" },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT
            InvoNum,
            ClName,
            Provide,
            MoneyRemain,
            Driver,
            CarNam,
            warehouseS,
            Por
          FROM \`${dbName}\`.sellmoney
          WHERE Driver = ?
            AND wholesale <> ?
            AND Por <> ?
            AND warehouseS = ?
            AND MoneyRemain > 0
          ORDER BY Provide ASC, ID ASC
        `,
        [driverName, WHOLESALE_FLAG, CANCELLED_STATUS, READY_STATUS],
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

    console.error("Error fetching driver payment invoices:", error);
    return NextResponse.json(
      { error: "Error fetching driver invoices" },
      { status: 500 },
    );
  }
}
