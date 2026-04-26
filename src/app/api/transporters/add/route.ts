import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

async function executeQuery(query: string, values: any[]) {
  const db = await pool.getConnection();
  try {
    const [result] = await db.execute(query, values);
    return result;
  } finally {
    db.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const body = await request.json();
    const { Name } = body;

    if (!Name) {
      return NextResponse.json({ error: "Trasporter name is required" }, { status: 400 });
    }

    const result = await executeQuery(
      `
        INSERT INTO \`${dbName}\`.trasporters (Name, flag)
        VALUES (?, ?)
      `,
      [Name, "1"],
    );

    return NextResponse.json({
      message: "Trasporter added successfully",
      providerId: (result as any).insertId,
    });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error adding Trasporter:", error);
    return NextResponse.json(
      { error: "An error occurred while adding the Trasporter" },
      { status: 500 },
    );
  }
}
