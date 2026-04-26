import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";

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

function parseNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) {
    return NaN;
  }

  return Number.parseFloat(normalizedValue);
}

function parseIntegerValue(value: unknown) {
  if (typeof value === "number") {
    return Math.trunc(value);
  }

  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) {
    return NaN;
  }

  return Number.parseInt(normalizedValue, 10);
}

function normalizeCostUpdateScope(value: unknown) {
  return value === "sync_selltable" ? "sync_selltable" : "entrytable_only";
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const {
      id,
      RoomName,
      RoomPrice,
      RoomCost,
      RoomCounts,
      DelevCount,
      FlowCount,
      flagf,
      info,
      Namee,
      Tier1,
      Tier2,
      Tier3,
      wholesale,
      ExternalPurchase,
      FinancialAccount,
      RoomCostUpdateScope,
    } = await req.json();

    const numericRoomPrice = parseNumberValue(RoomPrice);
    const numericRoomCost = parseNumberValue(RoomCost);
    const numericRoomCounts = parseIntegerValue(RoomCounts);
    const numericDeliveredCount = parseIntegerValue(DelevCount);
    const numericFlowCount = parseIntegerValue(FlowCount);
    const numericTier1 = Number.isFinite(parseNumberValue(Tier1)) ? parseNumberValue(Tier1) : 0;
    const numericTier2 = Number.isFinite(parseNumberValue(Tier2)) ? parseNumberValue(Tier2) : 0;
    const numericTier3 = Number.isFinite(parseNumberValue(Tier3)) ? parseNumberValue(Tier3) : 0;
    const externalPurchaseFlag = normalizeExternalPurchaseFlag(ExternalPurchase);
    const linkedFinancialAccount = normalizeFinancialAccountName(FinancialAccount);
    const costUpdateScope = normalizeCostUpdateScope(RoomCostUpdateScope);

    if (
      !id ||
      !RoomName ||
      !Number.isFinite(numericRoomPrice) ||
      !Number.isFinite(numericRoomCost) ||
      !Number.isFinite(numericRoomCounts) ||
      !Number.isFinite(numericDeliveredCount) ||
      !Number.isFinite(numericFlowCount)
    ) {
      return NextResponse.json({ message: "Invalid entry data." }, { status: 400 });
    }

    if (isExternalPurchaseEnabled(externalPurchaseFlag) && !linkedFinancialAccount) {
      return NextResponse.json(
        { message: "Financial account is required for external purchase items." },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();
      await ensureEntrytableExternalPurchaseColumns(db, dbName);

      const [result] = await db.query<ResultSetHeader>(
        `
          UPDATE \`${dbName}\`.entrytable
          SET
            RoomName = ?,
            RoomPrice = ?,
            RoomCost = ?,
            RoomCounts = ?,
            DelevCount = ?,
            FlowCount = ?,
            flagf = ?,
            info = ?,
            Namee = ?,
            Tier1 = ?,
            Tier2 = ?,
            Tier3 = ?,
            wholesale = ?,
            ExternalPurchase = ?,
            FinancialAccount = ?
          WHERE id = ?
        `,
        [
          String(RoomName).trim(),
          numericRoomPrice,
          numericRoomCost,
          numericRoomCounts,
          numericDeliveredCount,
          numericFlowCount,
          flagf,
          info,
          Namee,
          numericTier1,
          numericTier2,
          numericTier3,
          wholesale,
          externalPurchaseFlag,
          linkedFinancialAccount,
          id,
        ],
      );

      if (result.affectedRows === 0) {
        await db.rollback();
        return NextResponse.json({ message: "Entry not found." }, { status: 404 });
      }

      let updatedSalesRows = 0;
      if (costUpdateScope === "sync_selltable") {
        const [salesUpdateResult] = await db.query<ResultSetHeader>(
          `
            UPDATE \`${dbName}\`.selltable
            SET RoomCost = ? * countt
            WHERE RoomNum = ?
          `,
          [numericRoomCost, id],
        );

        updatedSalesRows = salesUpdateResult.affectedRows;
      }

      await db.commit();

      return NextResponse.json(
        {
          message: "Entry updated successfully.",
          updatedSalesRows,
          costUpdateScope,
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

    console.error("Error updating entry:", error);
    return NextResponse.json({ message: "Error updating entry." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ message: "Method GET not allowed." }, { status: 405 });
}
