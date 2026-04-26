import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

function generateRandomString(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const [rows] = await db.execute(
        `
          SELECT
            a.Id,
            a.Clname,
            a.affiliate,
            a.TiD,
            a.username,
            SUM(p.MPU) AS totalMPU
          FROM \`${dbName}\`.affiliate a
          LEFT JOIN \`${dbName}\`.affiliatepu p ON a.Id = p.affiliateID
          GROUP BY a.Id
        `,
      );

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

    console.error("Error fetching affiliates with MPU totals:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorResponse = NextResponse.json({ error: errorMessage }, { status: 500 });
    errorResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    errorResponse.headers.set("Pragma", "no-cache");
    errorResponse.headers.set("Expires", "0");
    return errorResponse;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { Clname, affiliate, TiD } = await request.json();

    if (!Clname || !affiliate || !TiD) {
      return NextResponse.json(
        { error: "All fields are required: Clname, affiliate, TiD" },
        { status: 400 },
      );
    }

    const db = await pool.getConnection();

    try {
      let username = generateRandomString(10);

      while (true) {
        const [rows]: any = await db.query(
          `SELECT 1 FROM \`${dbName}\`.affiliate WHERE username = ? LIMIT 1`,
          [username],
        );

        if (rows.length === 0) {
          break;
        }

        username = generateRandomString(10);
      }

      await db.execute(
        `INSERT INTO \`${dbName}\`.affiliate (Clname, affiliate, TiD, username) VALUES (?, ?, ?, ?)`,
        [Clname, affiliate, TiD, username],
      );

      return NextResponse.json(
        { message: "Affiliate added successfully", username },
        { status: 201 },
      );
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error adding affiliate:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
