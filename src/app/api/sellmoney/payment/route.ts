import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface PaymentRequest {
  invoNum: string;
  moneyPaid: number;
  moneyRemain: number;
  ClName: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const operatorName = session.user.name;
    const { invoNum, moneyPaid, moneyRemain, ClName }: PaymentRequest = await req.json();

    if (!operatorName || !invoNum || moneyPaid == null || moneyRemain == null || !ClName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [rows] = (await db.query(
        `SELECT * FROM \`${dbName}\`.sellmoney WHERE InvoNum = ? FOR UPDATE`,
        [invoNum],
      )) as any;

      if (rows.length === 0) {
        await db.rollback();
        return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
      }

      const sellMoneyRecord = rows[0];

      if (Number(sellMoneyRecord.MoneyRemain) !== Number(moneyRemain)) {
        await db.rollback();
        return NextResponse.json(
          { message: "Money remaining does not match the record" },
          { status: 400 },
        );
      }

      if (Number(sellMoneyRecord.MoneyRemain) < Number(moneyPaid)) {
        await db.rollback();
        return NextResponse.json(
          { message: "Payment exceeds the remaining amount" },
          { status: 400 },
        );
      }

      const updatedMoneyPaid = Number(sellMoneyRecord.MoneyPaid) + Number(moneyPaid);
      const updatedMoneyRemain = Number(sellMoneyRecord.MoneyRemain) - Number(moneyPaid);

      const [updateResult] = (await db.query(
        `UPDATE \`${dbName}\`.sellmoney SET MoneyPaid = ?, MoneyRemain = ? WHERE InvoNum = ?`,
        [updatedMoneyPaid, updatedMoneyRemain, invoNum],
      )) as any;

      const affectedRows = (updateResult as { affectedRows: number }).affectedRows;

      if (affectedRows === 0) {
        await db.rollback();
        return NextResponse.json({ message: "Failed to update payment" }, { status: 500 });
      }

      await db.query(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name, OpName)
          VALUES (?, ?, ?, ?, ?)
        `,
        [invoNum, moneyPaid, "Invoices Payment", ClName, operatorName],
      );

      await db.commit();

      return NextResponse.json(
        {
          message: "Payment processed successfully",
          updatedMoneyPaid,
          updatedMoneyRemain,
        },
        { status: 200 },
      );
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
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
