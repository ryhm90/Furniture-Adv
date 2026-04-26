import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

function parseNumberInput(value: string | number | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value.replace(/,/g, ""));
  }

  return Number.NaN;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const body = await request.json();
    const { name, amount, details, state } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      if (!amount && amount !== 0) {
        const [result] = await db.execute(
          `
            INSERT INTO \`${dbName}\`.dept (
              Name,
              Amount,
              state
            )
            VALUES (?, ?, ?)
          `,
          [name, "0", "New"],
        );

        await db.commit();
        return NextResponse.json({ message: "Invoice added successfully", result });
      }

      const formattedAmount = parseNumberInput(amount);
      if (!Number.isFinite(formattedAmount)) {
        await db.rollback();
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const [result] = await db.execute(
        `
          INSERT INTO \`${dbName}\`.dept (
            Name,
            Amount,
            state,
            details
          )
          VALUES (?, ?, ?, ?)
        `,
        [name, formattedAmount, "In", details || "تعزيز رصيد المحفظة"],
      );

      if (!state) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (
              details,
              MoneyPaid,
              type,
              name
            )
            VALUES (?, -?, ?, ?)
          `,
          [details || "تعزيز رصيد المحفظة", formattedAmount, "Financials", name],
        );
      }

      await db.commit();
      return NextResponse.json({ message: "Invoice added successfully", result });
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json(
      { error: "An error occurred while adding the invoice" },
      { status: 500 },
    );
  }
}
