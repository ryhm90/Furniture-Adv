import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const BONUS_ELIGIBLE_FLAGS = ["\u063A\u0631\u0641\u0629", "\u062A\u062E\u0645"];

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { RoomNum, InvoNum, countt, flagf, sellor, RoomCost } = await request.json();

    if (!RoomNum || !InvoNum || !countt || RoomCost === undefined) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const quantity = Number(countt);
    const unitCost = Number(RoomCost);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost)) {
      return NextResponse.json({ message: "Invalid room quantity or cost" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      if (BONUS_ELIGIBLE_FLAGS.includes(flagf) && sellor) {
        await db.execute(
          `UPDATE \`${dbName}\`.employees SET bonus = bonus + ? WHERE name = ?`,
          [5000 * quantity, sellor],
        );
      }

      await db.execute(
        `
          INSERT INTO \`${dbName}\`.selltable (RoomNum, InvoNum, State, countt, RoomCost)
          VALUES (?, ?, '1', ?, ?)
        `,
        [RoomNum, InvoNum, quantity, unitCost * quantity],
      );

      await db.execute(
        `UPDATE \`${dbName}\`.entrytable SET RoomCounts = RoomCounts - ? WHERE id = ?`,
        [quantity, RoomNum],
      );

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
