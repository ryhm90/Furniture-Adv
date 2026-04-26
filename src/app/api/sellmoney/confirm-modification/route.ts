import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  ensureSellMoneyModificationSchemaReady,
  insertSellMoneyModificationHistory,
} from "@/lib/sellmoneyModification";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { invoNum, note } = await request.json();

    if (!invoNum) {
      return NextResponse.json({ message: "رقم الوصل مطلوب." }, { status: 400 });
    }

    const actorName = session.user.name?.trim() || session.user.email || "Manager";
    const db = await pool.getConnection();

    try {
      await ensureSellMoneyModificationSchemaReady(db, dbName);
      await db.beginTransaction();

      const [result]: any = await db.execute(
        `
          UPDATE \`${dbName}\`.sellmoney
          SET
            modification_confirmed = 'Y',
            modification_confirmed_at = NOW(),
            modification_confirmed_by = ?
          WHERE InvoNum = ?
            AND is_modified = 'Y'
        `,
        [actorName, invoNum],
      );

      if (result.affectedRows === 0) {
        await db.rollback();
        return NextResponse.json(
          { message: "لم يتم العثور على وصل معدل يحتاج إلى تأكيد." },
          { status: 404 },
        );
      }

      await insertSellMoneyModificationHistory(db, dbName, {
        invoNum,
        actionType: "confirmed",
        summary: note?.trim()
          ? `تم تأكيد تعديل الوصل من قبل المدير. ملاحظة: ${note.trim()}`
          : "تم تأكيد تعديل الوصل من قبل المدير.",
        actorName,
      });

      await db.commit();

      return NextResponse.json({ message: "تم تأكيد تعديل الوصل بنجاح." });
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

    console.error("Error confirming invoice modification:", error);
    return NextResponse.json({ message: "تعذر تأكيد تعديل الوصل." }, { status: 500 });
  }
}
