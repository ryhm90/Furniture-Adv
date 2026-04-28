import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const CANCELED_STATUS = "\u0645\u0644\u063A\u0649";
const WHOLESALE_FLAG = "y";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("query");
    const queryDate = url.searchParams.get("date");
    const db = await pool.getConnection();

    try {
      let rows;
      const wildcardSearch = `%${searchQuery}%`;

      if (searchQuery) {
        [rows] = await db.execute(
          `
            SELECT sm.*, st.RoomNum, st.countt, et.RoomName
            FROM \`${dbName}\`.sellmoney sm
            LEFT JOIN \`${dbName}\`.selltable st ON sm.invonum = st.invonum
            LEFT JOIN \`${dbName}\`.entrytable et ON st.RoomNum = et.id
            WHERE (sm.ClName LIKE ? OR sm.CellPhone LIKE ? OR sm.CellPhone1 LIKE ?)
              AND sm.por <> ?
              AND LOWER(COALESCE(sm.wholesale, '')) != ?
            ORDER BY sm.ID DESC
          `,
          [wildcardSearch, wildcardSearch, wildcardSearch, CANCELED_STATUS, WHOLESALE_FLAG],
        );
      } else if (queryDate) {
        [rows] = await db.execute(
          `
            SELECT sm.*, st.RoomNum, st.countt, et.RoomName
            FROM \`${dbName}\`.sellmoney sm
            LEFT JOIN \`${dbName}\`.selltable st ON sm.invonum = st.invonum
            LEFT JOIN \`${dbName}\`.entrytable et ON st.RoomNum = et.id
            WHERE DATE(sm.Provide) = ? AND sm.por <> ? AND LOWER(COALESCE(sm.wholesale, '')) != ?
            ORDER BY sm.ID DESC
          `,
          [queryDate, CANCELED_STATUS, WHOLESALE_FLAG],
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
