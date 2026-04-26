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

async function getDrivers(db: any, dbName: string) {
  const [rows] = await db.query(
    `SELECT ID, Name FROM \`${dbName}\`.driver WHERE flag = '1' ORDER BY Name ASC`,
  );

  return rows;
}

export const PUT = async (req: NextRequest) => {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const drivers = normalizePeoplePayload(await req.json());
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      for (const driver of drivers) {
        if (driver.ID) {
          const [existingRowsResult] = await db.query(
            `SELECT Name FROM \`${dbName}\`.driver WHERE id = ? LIMIT 1`,
            [driver.ID],
          );
          const existingRows = Array.isArray(existingRowsResult) ? existingRowsResult : [];
          const previousRow =
            existingRows.length > 0 ? (existingRows[0] as { Name?: unknown }) : null;
          const previousName = previousRow?.Name ? String(previousRow.Name).trim() : "";

          await db.query(`UPDATE \`${dbName}\`.driver SET name = ? WHERE id = ?`, [
            driver.Name,
            driver.ID,
          ]);

          if (previousName && previousName !== driver.Name) {
            await db.query(`UPDATE \`${dbName}\`.sellmoney SET Driver = ? WHERE Driver = ?`, [
              driver.Name,
              previousName,
            ]);
          }
        } else {
          await db.query(`INSERT INTO \`${dbName}\`.driver (name, flag) VALUES (?, "1")`, [
            driver.Name,
          ]);
        }
      }

      const items = await getDrivers(db, dbName);
      await db.commit();

      return NextResponse.json(
        { message: "تم تحديث السائقين بنجاح.", items },
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

    console.error("Error updating drivers:", error);
    return NextResponse.json({ message: "فشل في تحديث السائقين." }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest) => {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "معرف السائق غير موجود." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();
      await db.query(`UPDATE \`${dbName}\`.driver SET flag = '0' WHERE id = ?`, [id]);
      const items = await getDrivers(db, dbName);
      await db.commit();

      return NextResponse.json(
        { message: "تم حذف السائق بنجاح.", items },
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

    console.error("Error deleting driver:", error);
    return NextResponse.json({ message: "فشل في حذف السائق." }, { status: 500 });
  }
};
