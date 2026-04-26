import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { ensureSellMoneyModificationSchemaReady } from "@/lib/sellmoneyModification";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const WHOLESALE_FLAG = "Y";
const NOT_READY_STATUS = "\u063A\u064A\u0631 \u0645\u062C\u0647\u0632";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query");
    const queryDate = url.searchParams.get("date");
    const driverQuery = url.searchParams.get("driver");
    const db = await pool.getConnection();

    try {
      await ensureSellMoneyModificationSchemaReady(db, dbName);
      let rows;
      const wildcardSearch = `%${searchQuery}%`;

      if (searchQuery) {
        [rows] = await db.execute(
          `SELECT * FROM \`${dbName}\`.sellmoney WHERE ClName LIKE ? OR CellPhone LIKE ? OR CellPhone1 LIKE ? ORDER BY ID DESC`,
          [wildcardSearch, wildcardSearch, wildcardSearch],
        );
      } else if (driverQuery) {
        if (driverQuery === "Null") {
          [rows] = await db.execute(
            `
              SELECT * FROM \`${dbName}\`.sellmoney
              WHERE Driver IS NULL AND wholesale <> ? AND Por = ?
              ORDER BY provide ASC
            `,
            [WHOLESALE_FLAG, NOT_READY_STATUS],
          );
        } else {
          [rows] = await db.execute(
            `
              SELECT * FROM \`${dbName}\`.sellmoney
              WHERE Driver = ? AND wholesale <> ? AND Por = ?
              ORDER BY provide ASC
            `,
            [driverQuery, WHOLESALE_FLAG, NOT_READY_STATUS],
          );
        }
      } else if (queryDate) {
        [rows] = await db.execute(
          `SELECT * FROM \`${dbName}\`.sellmoney WHERE DATE(Provide) = ? ORDER BY ID DESC`,
          [queryDate],
        );
      } else {
        rows = [{}];
      }

      return NextResponse.json(rows);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Database query error:", error);
    return NextResponse.json({ error: "Error retrieving data" }, { status: 500 });
  }
}
