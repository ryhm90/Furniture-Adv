import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { updateSalesTelegramInboxStatus } from "@/lib/salesTelegramInbox";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

interface UpdateTelegramInboxStatusBody {
  isExecuted?: boolean;
  linkedInvoiceNumber?: string | null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const { id } = await context.params;
    const numericId = Number.parseInt(id, 10);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ message: "Invalid inbox item id." }, { status: 400 });
    }

    const body: UpdateTelegramInboxStatusBody = await request.json();
    const isExecuted = Boolean(body?.isExecuted);
    const linkedInvoiceNumber =
      typeof body?.linkedInvoiceNumber === "string" && body.linkedInvoiceNumber.trim()
        ? body.linkedInvoiceNumber.trim()
        : null;
    const db = await pool.getConnection();

    try {
      await updateSalesTelegramInboxStatus(
        db,
        dbName,
        numericId,
        isExecuted,
        session.user.name ?? "",
        linkedInvoiceNumber,
      );

      return NextResponse.json({
        message: isExecuted ? "تم تحديث الطلب كمنفذ." : "تمت إعادة الطلب إلى غير منفذ.",
      });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error updating Telegram sales inbox status:", error);
    return NextResponse.json({ message: "Failed to update Telegram inbox item." }, { status: 500 });
  }
}
