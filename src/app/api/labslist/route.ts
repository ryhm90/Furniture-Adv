import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireSession,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT
            appointment.id,
            appointment.name,
            appointment.phone,
            appointment.dt,
            lab.type,
            lab.state,
            lab.labname
          FROM \`${dbName}\`.appointment appointment
          INNER JOIN \`${dbName}\`.lab lab ON appointment.id = lab.Aid
          GROUP BY
            appointment.id,
            appointment.name,
            appointment.phone,
            appointment.dt,
            lab.type,
            lab.state,
            lab.labname
          ORDER BY appointment.dt DESC
        `,
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

    return NextResponse.json({ error }, { status: 500 });
  }
}
