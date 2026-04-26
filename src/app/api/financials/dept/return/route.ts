import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const SAFEBOX_ACCOUNT = "\u0645\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642";
const PREVIOUS_REQUEST_SOURCE = "\u0637\u0644\u0628 \u0633\u0627\u0628\u0642";

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
    const { name, amount, source, details } = body;

    if (!name || amount === undefined || name.trim() === "" || amount === "") {
      return NextResponse.json(
        { error: "All fields (name, amount) are required." },
        { status: 400 },
      );
    }

    const formattedAmount = parseNumberInput(amount);
    if (!Number.isFinite(formattedAmount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [result] = await db.execute(
        `
          INSERT INTO \`${dbName}\`.dept (
            Name,
            Amount,
            state,
            details
          )
          VALUES (?, -?, ?, ?)
        `,
        [name, formattedAmount, "Out", details],
      );

      if (source === SAFEBOX_ACCOUNT) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (
              details,
              MoneyPaid,
              type,
              name
            )
            VALUES (?, ?, ?, ?)
          `,
          ["Money Return", formattedAmount, "Financials", name],
        );
      } else if (source !== PREVIOUS_REQUEST_SOURCE) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.dept (
              Name,
              Amount,
              state,
              details
            )
            VALUES (?, ?, ?, ?)
          `,
          [source, formattedAmount, "In", details],
        );
      }

      await db.commit();
      return NextResponse.json({ message: "Money added successfully", result });
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
    return NextResponse.json({ error: "An error occurred while adding Money" }, { status: 500 });
  }
}
