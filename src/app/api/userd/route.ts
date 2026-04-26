import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireSession,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

async function executeQuery(query: string, values: any[]) {
  const db = await pool.getConnection();
  try {
    const [rows] = await db.execute(query, values);
    return rows as RowDataPacket[] | ResultSetHeader;
  } finally {
    db.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    const result = await executeQuery(
      `SELECT id FROM \`${dbName}\`.patient WHERE name = ?`,
      [name],
    );

    if ((result as RowDataPacket[]).length > 0) {
      return NextResponse.json({ id: (result as RowDataPacket[])[0].id });
    }

    return NextResponse.json({ message: "User not found", status: 404 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred", status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const { name, phone } = await request.json();

    const existingUser = await executeQuery(
      `SELECT id FROM \`${dbName}\`.patient WHERE name = ?`,
      [name],
    );

    if ((existingUser as RowDataPacket[]).length > 0) {
      return NextResponse.json({ id: (existingUser as RowDataPacket[])[0].id, status: 200 });
    }

    const insertResult = await executeQuery(
      `INSERT INTO \`${dbName}\`.patient (name, phone) VALUES (?, ?)`,
      [name, phone],
    );
    const insertId = (insertResult as ResultSetHeader).insertId;
    const newUser = await executeQuery(
      `SELECT id FROM \`${dbName}\`.patient WHERE id = ?`,
      [insertId],
    );

    if ((newUser as RowDataPacket[]).length > 0) {
      return NextResponse.json({ id: (newUser as RowDataPacket[])[0].id, status: 201 });
    }

    throw new Error("Failed to retrieve new patient record");
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error creating or fetching user:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred", status: 500 },
    );
  }
}
