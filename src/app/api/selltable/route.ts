import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import {
  ensureEntrytableExternalPurchaseColumns,
  ensureSelltableExternalPurchaseColumns,
  isExternalPurchaseEnabled,
  normalizeFinancialAccountName,
} from "@/lib/externalPurchase";
import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const BONUS_ELIGIBLE_FLAGS = ["غرفة", "تخم"];

interface InventoryRow extends RowDataPacket {
  RoomName: string;
  RoomCost: number;
  flagf: string;
  ExternalPurchase: string | null;
  FinancialAccount: string | null;
}

function parseNumberish(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseFloat(String(value).replace(/,/g, ""));
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const { RoomNum, InvoNum, countt, sellor } = await request.json();

    if (!RoomNum || !InvoNum || !countt) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const quantity = parseNumberish(countt);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ message: "Invalid room quantity or cost" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureEntrytableExternalPurchaseColumns(db, dbName);
      await ensureSelltableExternalPurchaseColumns(db, dbName);
      await db.beginTransaction();

      const [inventoryRows] = await db.query<InventoryRow[]>(
        `
          SELECT RoomName, RoomCost, flagf, ExternalPurchase, FinancialAccount
          FROM \`${dbName}\`.entrytable
          WHERE id = ?
          FOR UPDATE
        `,
        [RoomNum],
      );

      const inventoryItem = inventoryRows[0];
      if (!inventoryItem) {
        await db.rollback();
        return NextResponse.json({ message: "Room not found" }, { status: 404 });
      }

      const roomCost = Number(inventoryItem.RoomCost);
      if (!Number.isFinite(roomCost)) {
        await db.rollback();
        return NextResponse.json({ message: "Invalid room quantity or cost" }, { status: 400 });
      }

      const linkedFinancialAccount = normalizeFinancialAccountName(inventoryItem.FinancialAccount);
      const externalPurchaseFlag = isExternalPurchaseEnabled(inventoryItem.ExternalPurchase)
        ? "Y"
        : "N";

      if (BONUS_ELIGIBLE_FLAGS.includes(inventoryItem.flagf) && sellor) {
        await db.execute(
          `UPDATE \`${dbName}\`.employees SET bonus = bonus + ? WHERE name = ?`,
          [5000 * quantity, sellor],
        );
      }

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.selltable (
            RoomNum,
            InvoNum,
            State,
            countt,
            RoomCost,
            ExternalPurchase,
            FinancialAccount
          )
          VALUES (?, ?, '1', ?, ?, ?, ?)
        `,
        [
          RoomNum,
          InvoNum,
          quantity,
          roomCost * quantity,
          externalPurchaseFlag,
          linkedFinancialAccount,
        ],
      );

      await db.execute(
        `UPDATE \`${dbName}\`.entrytable SET RoomCounts = RoomCounts - ? WHERE id = ?`,
        [quantity, RoomNum],
      );

      if (externalPurchaseFlag === "Y" && linkedFinancialAccount) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.dept (
              Name,
              Amount,
              state,
              details
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            linkedFinancialAccount,
            roomCost * quantity,
            "In",
            `تكلفة بيع المادة ${inventoryItem.RoomName} من الوصل ${InvoNum}`,
          ],
        );
      }

      await db.commit();
      return NextResponse.json(
        { message: "Room added to selltable successfully" },
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

    console.error("Error inserting into selltable:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
