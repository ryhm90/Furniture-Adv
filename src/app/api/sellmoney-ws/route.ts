import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const READY_STATUS = "\u0645\u062C\u0647\u0632";
const PREPARED_STATUS = "\u062C\u0647\u0632\u062A";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const {
      InvoNum,
      MoneyPaid,
      Sum,
      ClName,
      Provide,
      Provin,
      Provin2,
      Id,
      Driver,
    } = await request.json();

    if (
      !InvoNum ||
      MoneyPaid === undefined ||
      Sum === undefined ||
      !ClName ||
      !Provide ||
      !Provin ||
      !Id ||
      !Driver
    ) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (Number.isNaN(Number(Sum))) {
      return NextResponse.json({ message: "Invalid number format for Sum" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.sellmoney (
            InvoNum, MoneyPaid, MoneyRemain, Sum, ClName, details, CellPhone,
            Provide, Por, sellor, prin, Floor, CellPhone1, Provin, Provin2,
            wholesale, Driver, warehouseS
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          InvoNum,
          "0",
          Sum,
          Sum,
          ClName,
          "",
          "",
          Provide,
          READY_STATUS,
          "",
          "0",
          "",
          "",
          Provin,
          Provin2,
          "Y",
          Driver,
          PREPARED_STATUS,
        ],
      );

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.affiliatepu (affiliate, MPU, Invonum, date, affiliateID, De)
          VALUES (?, -?, ?, ?, ?, 'Buy')
        `,
        [ClName, Number(Sum), InvoNum, Provide, Id],
      );

      await db.commit();
      return NextResponse.json(
        { message: "Invoice added to sellmoney successfully" },
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

    console.error("Error inserting into sellmoney:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
