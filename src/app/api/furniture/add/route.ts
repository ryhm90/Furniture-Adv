import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  ensureEntrytableExternalPurchaseColumns,
  isExternalPurchaseEnabled,
  normalizeExternalPurchaseFlag,
  normalizeFinancialAccountName,
} from "@/lib/externalPurchase";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

function parseNumber(value: string) {
  return Number.parseFloat(value.replace(/,/g, ""));
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const {
      RoomName,
      RoomPrice,
      OriginalCost,
      RoomCost,
      RoomsCount,
      FlowCount,
      flagf,
      info,
      Namee,
      TotalCost,
      TU,
      ExternalPurchase,
      FinancialAccount,
    } = await request.json();

    if (
      !RoomName ||
      !RoomPrice ||
      !OriginalCost ||
      !RoomCost ||
      !RoomsCount ||
      !FlowCount ||
      !TotalCost ||
      !TU
    ) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const values = [
      RoomName,
      parseNumber(RoomPrice),
      parseNumber(OriginalCost),
      parseNumber(RoomCost),
      Number.parseInt(String(RoomsCount).replace(/,/g, ""), 10),
      Number.parseInt(String(FlowCount).replace(/,/g, ""), 10),
      flagf,
      info,
      Namee,
      Number.parseInt(String(RoomsCount).replace(/,/g, ""), 10),
    ];

    const externalPurchaseFlag = normalizeExternalPurchaseFlag(ExternalPurchase);
    const linkedFinancialAccount = normalizeFinancialAccountName(FinancialAccount);

    if (isExternalPurchaseEnabled(externalPurchaseFlag) && !linkedFinancialAccount) {
      return NextResponse.json(
        { message: "Financial account is required for external purchase items" },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      await ensureEntrytableExternalPurchaseColumns(db, dbName);

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.entrytable (
            RoomName, RoomPrice, roomor, RoomCost, RoomCounts,
            FlowCount, flagf, info, Namee, DelevCount, flag,
            ExternalPurchase, FinancialAccount
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1', ?, ?)
        `,
        [...values, externalPurchaseFlag, linkedFinancialAccount],
      );

      return NextResponse.json(
        { message: "Furniture entry added successfully" },
        { status: 200 },
      );
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error inserting furniture entry:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
