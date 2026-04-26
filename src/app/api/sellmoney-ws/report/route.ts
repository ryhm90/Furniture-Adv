import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const affiliate = searchParams.get("affiliate");

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate name is required." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT
            epu.Id,
            epu.Invonum,
            epu.date,
            sm.Driver,
            sm.Provin,
            sm.Provin2,
            sm.Por,
            epu.MPU,
            epu.De,
            st.countt,
            GROUP_CONCAT(et.RoomName SEPARATOR ', ') AS RoomNames
          FROM \`${dbName}\`.affiliatepu epu
          LEFT JOIN \`${dbName}\`.sellmoney sm ON epu.Invonum = sm.Invonum
          LEFT JOIN \`${dbName}\`.selltable st ON sm.Invonum = st.Invonum
          LEFT JOIN \`${dbName}\`.entrytable et ON st.RoomNum = et.id
          WHERE epu.affiliate = ? AND epu.MPU <> 0
          GROUP BY
            epu.Id, epu.Invonum, epu.date, sm.Driver, sm.Provin,
            sm.Provin2, sm.Por, epu.De, epu.MPU, st.countt
          ORDER BY epu.date ASC
        `,
        [affiliate],
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

    console.error("Error fetching sellmoney data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
