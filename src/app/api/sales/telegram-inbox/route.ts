import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  listSalesTelegramInbox,
  normalizeTelegramInboxStatusFilter,
} from "@/lib/salesTelegramInbox";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const status = normalizeTelegramInboxStatusFilter(
      new URL(request.url).searchParams.get("status"),
    );
    const db = await pool.getConnection();

    try {
      const result = await listSalesTelegramInbox(db, dbName, status);
      return NextResponse.json(result);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching Telegram sales inbox:", error);
    return NextResponse.json({ message: "Failed to fetch Telegram inbox." }, { status: 500 });
  }
}
