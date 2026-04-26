import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const CANCELED_STATUS = "\u0645\u0644\u063A\u0649";
const NOT_PREPARED_STATUS = "\u0644\u0645 \u062A\u062C\u0647\u0632";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "DOCTOR"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(`
        SELECT
          e.id,
          e.RoomName,
          e.RoomCounts,
          e.DelevCount,
          e.created_at,
          COALESCE((
            SELECT SUM(\`${dbName}\`.selltable.countt)
            FROM \`${dbName}\`.sellmoney
            INNER JOIN \`${dbName}\`.selltable
              ON \`${dbName}\`.sellmoney.InvoNum = \`${dbName}\`.selltable.InvoNum
            WHERE \`${dbName}\`.sellmoney.Por <> '${CANCELED_STATUS}'
              AND \`${dbName}\`.sellmoney.warehouseS = '${NOT_PREPARED_STATUS}'
              AND \`${dbName}\`.selltable.RoomNum = e.id
          ), 0) AS TotalSellCount,
          e.RoomCounts + COALESCE((
            SELECT SUM(\`${dbName}\`.selltable.countt)
            FROM \`${dbName}\`.sellmoney
            INNER JOIN \`${dbName}\`.selltable
              ON \`${dbName}\`.sellmoney.InvoNum = \`${dbName}\`.selltable.InvoNum
            WHERE \`${dbName}\`.sellmoney.Por <> '${CANCELED_STATUS}'
              AND \`${dbName}\`.sellmoney.warehouseS = '${NOT_PREPARED_STATUS}'
              AND \`${dbName}\`.selltable.RoomNum = e.id
          ), 0) AS Total
        FROM \`${dbName}\`.entrytable e
        ORDER BY e.id ASC
      `);

      const response = NextResponse.json(rows);
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
      return response;
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
    const errorResponse = NextResponse.json({ error: errorMessage }, { status: 500 });
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}
