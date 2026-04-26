import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const CANCELED_STATUS = "\u0645\u0644\u063A\u0649";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { affiliate, MPU, affiliateID, paymentDate } = await request.json();

    if (!affiliate || MPU === undefined || affiliateID === undefined || !paymentDate) {
      return NextResponse.json(
        { message: "Invalid input. Please provide all required fields." },
        { status: 400 },
      );
    }

    const normalizedPaymentDate = String(paymentDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedPaymentDate)) {
      return NextResponse.json(
        { message: "Invalid payment date format." },
        { status: 400 },
      );
    }

    const currentTime = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [sellMoneyRows]: any[] = await db.query(
        `
          SELECT InvoNum, moneyremain
          FROM \`${dbName}\`.sellmoney
          WHERE clname = ? AND wholesale = 'Y' AND por <> ? AND moneyremain <> 0
          ORDER BY Provide ASC
        `,
        [affiliate, CANCELED_STATUS],
      );

      if (!sellMoneyRows.length) {
        await db.rollback();
        return NextResponse.json(
          { message: "No matching record found in sellmoney." },
          { status: 404 },
        );
      }

      await db.execute<ResultSetHeader>(
        `
          INSERT INTO \`${dbName}\`.affiliatepu (affiliate, MPU, de, date, Time, affiliateID)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [affiliate, MPU, "Payment", normalizedPaymentDate, currentTime, affiliateID],
      );
      await db.execute<ResultSetHeader>(
        `
          INSERT INTO \`${dbName}\`.affiliatepu_temp (affiliate, MPU, de, date, Time, affiliateID)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [affiliate, MPU, "Payment", normalizedPaymentDate, currentTime, affiliateID],
      );

      const [affiliatePUTemp]: any = await db.query(
        `SELECT SUM(MPU) AS totalSum FROM \`${dbName}\`.affiliatepu_temp WHERE affiliateID = ?`,
        [affiliateID],
      );

      let remainingMPU = affiliatePUTemp[0]?.totalSum || 0;

      for (const row of sellMoneyRows) {
        const { InvoNum, moneyremain } = row;

        if (remainingMPU <= 0) {
          await db.commit();
          return NextResponse.json(
            { message: "Operation completed successfully." },
            { status: 200 },
          );
        }

        const amountToDeduct = Math.min(moneyremain, remainingMPU);

        await db.execute<ResultSetHeader>(
          `
          INSERT INTO \`${dbName}\`.affiliatepu_temp (
              affiliate, MPU, Invonum, de, date, Time, affiliateID
            )
            VALUES (?, -?, ?, ?, ?, ?, ?)
          `,
          [affiliate, amountToDeduct, InvoNum, "Pay", normalizedPaymentDate, currentTime, affiliateID],
        );
        await db.execute<ResultSetHeader>(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name, date)
            VALUES (?, ?, ?, ?, ?)
          `,
          [InvoNum, amountToDeduct, "Affiliate Payment", affiliate, normalizedPaymentDate],
        );
        await db.execute<ResultSetHeader>(
          `
            UPDATE \`${dbName}\`.sellmoney
            SET moneyremain = ?, MoneyPaid = MoneyPaid + ?
            WHERE InvoNum = ?
          `,
          [moneyremain - amountToDeduct, amountToDeduct, InvoNum],
        );

        remainingMPU -= amountToDeduct;
      }

      if (remainingMPU >= 0) {
        await db.rollback();
        return NextResponse.json(
          { message: "Not all MPU could be processed due to insufficient funds." },
          { status: 400 },
        );
      }

      await db.commit();
      return NextResponse.json({ message: "Operation completed successfully." });
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

    console.error("Error in API:", error);
    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 },
    );
  }
}
