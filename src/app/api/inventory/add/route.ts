import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value.replace(/,/g, "")) || 0;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const {
      transporterId,
      itemName,
      RoomPrice,
      type,
      originalCost,
      itemCost,
      receivedCount,
      selectedProvidorIda,
      selectedRecord,
      transportPrice,
      transporterName,
      unloadCost,
      changeRate,
      providerName,
      factoryPrice,
    } = await request.json();

    if (
      !transporterId ||
      !itemName ||
      !RoomPrice ||
      !type ||
      !originalCost ||
      !itemCost ||
      !receivedCount ||
      !selectedProvidorIda ||
      !selectedRecord ||
      !transportPrice ||
      !transporterName ||
      !unloadCost ||
      !changeRate ||
      !providerName ||
      !factoryPrice
    ) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 },
      );
    }

    const formattedDate = new Date();
    const mysqlFormattedDate = formattedDate.toLocaleDateString("en-CA");
    const sanitizedValues = {
      RoomPrice: parseNumber(RoomPrice),
      originalCost: parseNumber(originalCost),
      itemCost: parseNumber(itemCost),
      receivedCount: parseInt(parseNumber(receivedCount).toString(), 10),
      transportPrice: parseNumber(transportPrice),
      unloadCost: parseNumber(unloadCost),
      changeRate: parseNumber(changeRate),
      factoryPrice: parseNumber(factoryPrice),
    };
    const total = sanitizedValues.factoryPrice * sanitizedValues.receivedCount;
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.entrytable (
            RoomName, RoomPrice, RoomOr, RoomCost, RoomCounts, DelevCount, flagf, flag, provID, transID
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, '1', ?, ?)
        `,
        [
          itemName,
          sanitizedValues.RoomPrice,
          sanitizedValues.originalCost,
          sanitizedValues.itemCost,
          sanitizedValues.receivedCount,
          sanitizedValues.receivedCount,
          type,
          selectedProvidorIda,
          selectedRecord,
        ],
      );

      await db.execute(
        `
          UPDATE \`${dbName}\`.providorsde
          SET status = '\u0645\u062F\u062E\u0644\u0629', transportername = ?, transportercost = ?, unlaodcost = ?
          WHERE ID = ?
        `,
        [
          transporterName,
          sanitizedValues.transportPrice,
          sanitizedValues.unloadCost,
          selectedRecord,
        ],
      );

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.payments (
            status,
            Inn,
            \`Out\`,
            Details,
            type,
            Name,
            Name_ID,
            \`change\`,
            v
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          "Delivery",
          0,
          sanitizedValues.transportPrice,
          itemName,
          "Transporter",
          transporterName,
          transporterId,
          sanitizedValues.changeRate,
          sanitizedValues.transportPrice,
        ],
      );

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (
            details,
            MoneyPaid,
            type,
            name
          )
          VALUES (?, -?, ?, ?)
        `,
        [
          itemName,
          sanitizedValues.unloadCost,
          "Unloading Container",
          transporterName,
        ],
      );

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.payments (
            status,
            Inn,
            \`Out\`,
            Details,
            type,
            Name,
            Name_ID,
            dateIssued,
            \`change\`,
            v
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          "Order",
          "0",
          total,
          itemName,
          "Providor",
          providerName,
          selectedProvidorIda,
          mysqlFormattedDate,
          sanitizedValues.changeRate,
          total,
        ],
      );

      await db.commit();

      return NextResponse.json(
        { message: "Furniture entry added successfully" },
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

    console.error("Error adding inventory entry:", error);
    return NextResponse.json(
      { message: "Failed to add inventory entry" },
      { status: 500 },
    );
  }
}
