import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(req.url);
    const invoNum = searchParams.get("invonum");

    if (!invoNum) {
      return NextResponse.json({ message: "Invoice number is required" }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      `
        SELECT st.roomnum, st.countt, et.flagf
        FROM \`${dbName}\`.selltable st
        INNER JOIN \`${dbName}\`.entrytable et ON et.id = st.roomnum
        WHERE st.InvoNum = ?
      `,
      [invoNum],
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "No entries found" }, { status: 404 });
    }

    return NextResponse.json({ entries: rows }, { status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
