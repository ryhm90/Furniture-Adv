import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const BONUS_ELIGIBLE_FLAGS = ["\u063A\u0631\u0641\u0629", "\u062A\u062E\u0645"];

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const { roomnum, decrementBy, sellor, flagf } = await req.json();

    if (!roomnum || decrementBy === undefined) {
      return NextResponse.json(
        { message: "Room number and decrement value are required" },
        { status: 400 },
      );
    }

    const quantity = Number(decrementBy);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ message: "Invalid decrement value" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      if (BONUS_ELIGIBLE_FLAGS.includes(flagf) && sellor) {
        await db.query(
          `UPDATE \`${dbName}\`.employees SET bonus = bonus - ? WHERE name = ?`,
          [5000 * quantity, sellor],
        );
      }

      await db.query(
        `UPDATE \`${dbName}\`.entrytable SET RoomCounts = RoomCounts + ? WHERE id = ?`,
        [quantity, roomnum],
      );

      await db.commit();
      return NextResponse.json(
        { message: "Count decremented successfully" },
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
