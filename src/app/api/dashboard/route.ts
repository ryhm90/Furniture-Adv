import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireSession,
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

export async function GET(_request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const db = await pool.getConnection();

    try {
      const query = `SELECT id, name, phone, address, created_at FROM \`${dbName}\`.patient`;
      const [rows] = await db.execute(query, []);
      return NextResponse.json(rows);
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const { id, name, phone, address, note } = await request.json();

    const query = `UPDATE \`${dbName}\`.patient SET name = ?, phone = ?, address = ?, note = ? WHERE id = ?`;
    const values = [name, phone, address, note, id];

    await executeQuery(query, values);

    return NextResponse.json({ message: "success", status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { message: "An unexpected error occurred", status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const { id } = await request.json();

    const query = `DELETE FROM \`${dbName}\`.patient WHERE id = ?`;
    const values = [id];

    await executeQuery(query, values);

    return NextResponse.json({ message: "success", status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { message: "An unexpected error occurred", status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const dbName = getDbNameFromSession(session);
    const { Pid, name, phone, dt, note, type, doctor } = await request.json();

    const query = `
      INSERT INTO \`${dbName}\`.appointment (
        Pid,
        name,
        phone,
        dt,
        note,
        type,
        analy,
        money,
        doctor,
        Status,
        OPGf,
        anesthetic
      ) VALUES (?, ?, ?, ?, ?, ?, 'No', 0, ?, 'Pending', 0, 'No')
    `;
    const values = [Pid, name, phone, dt, note ?? "", type, doctor ?? ""];

    await executeQuery(query, values);

    return NextResponse.json({ message: "success", status: 200 });
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    return NextResponse.json(
      { message: "An unexpected error occurred", status: 500 },
    );
  }
}
