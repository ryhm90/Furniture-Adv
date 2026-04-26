import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const IN_TRANSIT_STATUS = "\u0641\u064A \u0627\u0644\u0637\u0631\u064A\u0642";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    const db = await pool.getConnection();
    try {
      const [result] = await db.execute(
        `
          UPDATE \`${dbName}\`.providorsde
          SET status = ?
          WHERE ID = ?
        `,
        [IN_TRANSIT_STATUS, id],
      );

      if ((result as any).affectedRows === 0) {
        return NextResponse.json(
          { error: "Provider not found or status already updated." },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: "Status updated successfully." });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error updating provider status:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
