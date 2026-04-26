import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { InvoNum, Sum } = await request.json();

    if (!InvoNum || Sum === undefined) {
      return NextResponse.json({ error: "ID and Sum are required." }, { status: 400 });
    }

    const parsedID = Number.parseInt(InvoNum, 10);
    const parsedSum = Number.parseFloat(Sum);

    if (Number.isNaN(parsedID) || Number.isNaN(parsedSum)) {
      return NextResponse.json(
        { error: "ID and Sum must be valid numbers." },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [rows] = (await db.execute(
        `SELECT MoneyPaid FROM \`${dbName}\`.sellmoney WHERE InvoNum = ? FOR UPDATE`,
        [parsedID],
      )) as [RowDataPacket[], any];

      if (rows.length === 0) {
        await db.rollback();
        return NextResponse.json({ error: "Sellmoney entry not found." }, { status: 404 });
      }

      if (Number(rows[0].MoneyPaid) !== 0) {
        await db.rollback();
        return NextResponse.json({ message: "MoneyPaid is not zero, update skipped." });
      }

      await db.execute(
        `UPDATE \`${dbName}\`.sellmoney SET Sum = ?, MoneyRemain = ? WHERE InvoNum = ?`,
        [parsedSum, parsedSum, parsedID],
      );
      await db.execute(
        `UPDATE \`${dbName}\`.affiliatepu SET MPU = -? WHERE InvoNum = ?`,
        [parsedSum, parsedID],
      );

      await db.commit();
      return NextResponse.json({ message: "Sum updated successfully" });
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

    console.error("Error updating Sum:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
