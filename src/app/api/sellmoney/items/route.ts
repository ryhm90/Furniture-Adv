import { NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const url = new URL(request.url);
    const invoNum = url.searchParams.get("invonum");
    const db = await pool.getConnection();

    try {
      if (!invoNum) {
        return NextResponse.json({ message: "رقم الوصل مطلوب." }, { status: 400 });
      }

      const [rows] = await db.execute(
        `
          SELECT
            st.RoomNum AS roomnum,
            st.countt,
            st.RoomCost AS lineRoomCost,
            CASE
              WHEN st.countt > 0 THEN ROUND(st.RoomCost / st.countt, 2)
              ELSE st.RoomCost
            END AS unitRoomCost,
            et.RoomName,
            et.RoomCounts,
            et.flagf
          FROM \`${dbName}\`.selltable st
          INNER JOIN \`${dbName}\`.entrytable et ON st.RoomNum = et.id
          WHERE st.InvoNum = ?
          ORDER BY et.RoomName ASC
        `,
        [invoNum],
      );

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
