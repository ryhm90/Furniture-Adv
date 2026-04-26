import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

function isValidDateString(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const payload = await request.json();

    const expenseEntries = Array.isArray(payload?.expenses)
      ? payload.expenses
      : [
          {
            subSubject: payload?.subSubject,
            amount: payload?.amount,
            details: payload?.details,
            entryDate: payload?.entryDate ?? new Date().toLocaleDateString("en-CA"),
          },
        ];

    if (!expenseEntries.length) {
      return NextResponse.json(
        { message: "No expenses provided." },
        { status: 400 },
      );
    }

    for (const entry of expenseEntries) {
      if (
        !entry?.subSubject ||
        entry?.amount === undefined ||
        entry?.details === undefined ||
        !isValidDateString(entry?.entryDate)
      ) {
        return NextResponse.json(
          { message: "Invalid input. Please provide all required fields." },
          { status: 400 },
        );
      }
    }

    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      for (const entry of expenseEntries) {
        const [result] = await db.execute<ResultSetHeader>(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name, date)
            VALUES (?, ?, ?, ?, ?)
          `,
          [entry.details, entry.amount, "Expense", entry.subSubject, entry.entryDate],
        );

        if (result.affectedRows === 0) {
          await db.rollback();
          return NextResponse.json({ message: "Failed to add expense." }, { status: 500 });
        }
      }

      await db.commit();

      return NextResponse.json({
        message: "Expense added successfully.",
        count: expenseEntries.length,
      });
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

    console.error("Error in API /safeboxiqd/inserts:", error);
    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 },
    );
  }
}
