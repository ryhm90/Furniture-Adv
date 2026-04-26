import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const RECEIVED_STATUS = "\u0645\u0633\u062A\u0644\u0645\u0629";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const body = await request.json();
    const { id, receivedCount, notes } = body;

    if (!id || receivedCount === undefined || receivedCount === "" || notes === undefined) {
      return NextResponse.json(
        { error: "All fields (id, receivedCount, notes) are required." },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();
    try {
      const [result] = await db.execute(
        `
          UPDATE \`${dbName}\`.providorsde
          SET recivedCount = ?, note = ?, status = ?
          WHERE id = ?
        `,
        [receivedCount, notes, RECEIVED_STATUS, id],
      );

      if ((result as any).affectedRows === 0) {
        return NextResponse.json(
          { error: "Record not found or already updated." },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: "Arrival confirmed successfully." });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error confirming arrival:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
