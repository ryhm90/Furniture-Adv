import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface WorkerUpdateRequest {
  workerName: string;
  carflag?: string;
  driverflag?: string;
  ulaodflag?: string;
  invoNum: string;
}

const READY_STATUS = "\u0645\u062C\u0647\u0632";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const { workerName, carflag, driverflag, ulaodflag, invoNum }: WorkerUpdateRequest =
      await req.json();

    if (!workerName || !invoNum) {
      return NextResponse.json(
        { message: "Worker name and invoice number are required" },
        { status: 400 },
      );
    }

    const updateFields: string[] = [];
    const queryParams: (string | undefined)[] = [];

    if (carflag) {
      updateFields.push("Carflag = ?, CarNam = ?");
      queryParams.push(carflag, workerName);
    }

    if (driverflag) {
      updateFields.push("Driverflag = ?, Por = ?, Driver = ?");
      queryParams.push(driverflag, READY_STATUS, workerName);
    }

    if (ulaodflag) {
      updateFields.push("Ulaodflag = ?, Por = ?");
      queryParams.push(ulaodflag, READY_STATUS);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: "At least one flag is required to update" },
        { status: 400 },
      );
    }

    queryParams.push(invoNum);

    const updateQuery = `
      UPDATE \`${dbName}\`.sellmoney
      SET ${updateFields.join(", ")}
      WHERE invoNum = ?
    `;

    const [updateResult]: any = await pool.query(updateQuery, queryParams);

    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { message: "No rows updated. Check if invoice number is correct" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Worker flags updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error updating worker:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
