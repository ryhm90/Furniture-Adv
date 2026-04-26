import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

function normalizePeoplePayload(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      ID: item?.ID ?? null,
      Name: String(item?.Name ?? "").trim(),
    }))
    .filter((item) => item.Name);
}

async function getCarpenters(db: any, dbName: string) {
  const [rows] = await db.query(
    `SELECT ID, Name FROM \`${dbName}\`.carpenter WHERE flag = '1' ORDER BY Name ASC`,
  );

  return rows;
}

export const PUT = async (req: NextRequest) => {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const carpenters = normalizePeoplePayload(await req.json());
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      for (const carpenter of carpenters) {
        if (carpenter.ID) {
          const [existingRowsResult] = await db.query(
            `SELECT Name FROM \`${dbName}\`.carpenter WHERE id = ? LIMIT 1`,
            [carpenter.ID],
          );
          const existingRows = Array.isArray(existingRowsResult) ? existingRowsResult : [];
          const previousRow =
            existingRows.length > 0 ? (existingRows[0] as { Name?: unknown }) : null;
          const previousName = previousRow?.Name ? String(previousRow.Name).trim() : "";

          await db.query(`UPDATE \`${dbName}\`.carpenter SET name = ? WHERE id = ?`, [
            carpenter.Name,
            carpenter.ID,
          ]);

          if (previousName && previousName !== carpenter.Name) {
            await db.query(`UPDATE \`${dbName}\`.sellmoney SET CarNam = ? WHERE CarNam = ?`, [
              carpenter.Name,
              previousName,
            ]);
          }
        } else {
          await db.query(`INSERT INTO \`${dbName}\`.carpenter (name, flag) VALUES (?, "1")`, [
            carpenter.Name,
          ]);
        }
      }

      const items = await getCarpenters(db, dbName);
      await db.commit();

      return NextResponse.json(
        { message: "تم تحديث فنيي التركيب بنجاح.", items },
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

    console.error("Error updating carpenters:", error);
    return NextResponse.json({ message: "فشل في تحديث فنيي التركيب." }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "معرف فني التركيب غير موجود." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();
      await db.query(`UPDATE \`${dbName}\`.carpenter SET flag = '0' WHERE id = ?`, [id]);
      const items = await getCarpenters(db, dbName);
      await db.commit();

      return NextResponse.json(
        { message: "تم حذف فني التركيب بنجاح.", items },
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

    console.error("Error deleting carpenter:", error);
    return NextResponse.json({ message: "فشل في حذف فني التركيب." }, { status: 500 });
  }
};
