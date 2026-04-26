import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  ensureSellMoneyModificationSchemaReady,
  isReceiptModified,
} from "@/lib/sellmoneyModification";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const url = new URL(request.url);
    const invoNum = url.searchParams.get("invonum");

    if (!invoNum) {
      return NextResponse.json({ message: "رقم الوصل مطلوب." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureSellMoneyModificationSchemaReady(db, dbName);

      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT * FROM \`${dbName}\`.sellmoney WHERE InvoNum = ? LIMIT 1`,
        [invoNum],
      );

      const invoice = rows[0];
      if (!invoice) {
        return NextResponse.json({ message: "لم يتم العثور على الوصل." }, { status: 404 });
      }

      const [historyRows] = await db.execute<RowDataPacket[]>(
        `
          SELECT id, action_type, summary, payload, actor_name, created_at
          FROM \`${dbName}\`.sellmoney_modification_history
          WHERE invo_num = ?
          ORDER BY created_at DESC, id DESC
        `,
        [invoNum],
      );

      return NextResponse.json({
        ...invoice,
        isModified: isReceiptModified(invoice.is_modified),
        modificationConfirmed: isReceiptModified(invoice.modification_confirmed),
        modificationHistory: historyRows,
      });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error loading invoice details:", error);
    return NextResponse.json({ message: "تعذر تحميل تفاصيل الوصل." }, { status: 500 });
  }
}
