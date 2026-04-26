import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { ensureSellMoneyModificationSchemaReady } from "@/lib/sellmoneyModification";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface CreateSellMoneyRequest {
  InvoNum: string;
  MoneyPaid: number | string;
  Sum: number | string;
  ClName: string;
  details?: string;
  CellPhone: string;
  Provide: string;
  sellor?: string;
  Floor: string;
  FloorCost?: number | string;
  CellPhone1?: string;
  Provin: string;
  Provin2: string;
}

const NOT_READY_STATUS = "\u063A\u064A\u0631 \u0645\u062C\u0647\u0632";

function parseMoney(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value.replace(/,/g, ""));
  }

  return Number.NaN;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const {
      InvoNum,
      MoneyPaid,
      Sum,
      ClName,
      details,
      CellPhone,
      Provide,
      sellor,
      Floor,
      FloorCost,
      CellPhone1,
      Provin,
      Provin2,
    }: CreateSellMoneyRequest = await request.json();

    if (
      !InvoNum ||
      MoneyPaid == null ||
      Sum == null ||
      !ClName ||
      !CellPhone ||
      !Provide ||
      !Floor ||
      !Provin ||
      !Provin2
    ) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const sumNumber = parseMoney(Sum);
    const moneyPaidNumber = parseMoney(MoneyPaid);
    const floorCostNumber = parseMoney(FloorCost);
    const normalizedSellor = sellor?.trim() ?? "";

    if (!Number.isFinite(sumNumber) || !Number.isFinite(moneyPaidNumber)) {
      return NextResponse.json(
        { message: "Invalid number format for Sum or MoneyPaid" },
        { status: 400 },
      );
    }

    if (moneyPaidNumber < 0 || sumNumber < 0 || moneyPaidNumber > sumNumber) {
      return NextResponse.json({ message: "Invalid payment totals" }, { status: 400 });
    }

    if (moneyPaidNumber !== 0 && !normalizedSellor) {
      return NextResponse.json(
        { message: "Sellor is required when recording a payment" },
        { status: 400 },
      );
    }

    const moneyRemain = sumNumber - moneyPaidNumber;
    const db = await pool.getConnection();

    try {
      await ensureSellMoneyModificationSchemaReady(db, dbName);
      await db.beginTransaction();

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.sellmoney (
            InvoNum, MoneyPaid, MoneyRemain, Sum, ClName, details, CellPhone,
            Provide, Por, sellor, prin, Floor, FloorCost, CellPhone1, Provin, Provin2
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          InvoNum,
          moneyPaidNumber,
          moneyRemain,
          sumNumber,
          ClName,
          details ?? "",
          CellPhone,
          Provide,
          NOT_READY_STATUS,
          normalizedSellor,
          "0",
          Floor,
          Number.isFinite(floorCostNumber) ? floorCostNumber : 0,
          CellPhone1 ?? "",
          Provin,
          Provin2,
        ],
      );

      if (moneyPaidNumber !== 0) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name)
            VALUES (?, ?, ?, ?)
          `,
          [InvoNum, moneyPaidNumber, "Invoices Payment", ClName],
        );

        await db.execute(
          `UPDATE \`${dbName}\`.employees SET received = received + ? WHERE name = ?`,
          [moneyPaidNumber, normalizedSellor],
        );
      }

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
