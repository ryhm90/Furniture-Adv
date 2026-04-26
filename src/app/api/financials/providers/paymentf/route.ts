import { NextRequest, NextResponse } from "next/server";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { RowDataPacket } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface PaymentRow extends RowDataPacket {
  ID: number;
  Name_ID: number;
  Name: string;
  type: string;
  change: number;
  v: number;
}

const SAFEBOX_ACCOUNT = "\u0645\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642";

dayjs.extend(customParseFormat);

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
    const { providerId, amount, name, type, date, changeRate, IQDPayment, account } = body;

    const normalizedAmount = parseNumberInput(amount);
    const normalizedIQDPayment = parseNumberInput(IQDPayment);
    const normalizedChangeRate = parseNumberInput(changeRate);

    if (
      !providerId ||
      !name ||
      !type ||
      !date ||
      !account ||
      !Number.isFinite(normalizedAmount) ||
      !Number.isFinite(normalizedIQDPayment) ||
      !Number.isFinite(normalizedChangeRate)
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (normalizedAmount < 0 || normalizedIQDPayment < 0) {
      return NextResponse.json({ error: "The amount cannot be negative" }, { status: 400 });
    }

    const parsedDate = dayjs(date, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
    if (!parsedDate.isValid()) {
      return NextResponse.json({ error: `Invalid date format: ${date}` }, { status: 400 });
    }

    const formattedDate = parsedDate.format("YYYY-MM-DD");
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const [rows] = await db.execute<PaymentRow[]>(
        `
          SELECT ID, Name_ID, Name, type, \`change\`, v
          FROM \`${dbName}\`.payments
          WHERE Name_ID = ? AND type = ? AND v > 0 AND status <> ?
          ORDER BY ID ASC
        `,
        [providerId, type, "Payment"],
      );

      let remainingPayment = normalizedAmount;

      for (const row of rows) {
        if (remainingPayment <= 0) {
          break;
        }

        const rowValue = Number(row.v);
        const settledAmount = Math.min(remainingPayment, rowValue);
        const paymentDiff = settledAmount * Number(row.change) - settledAmount * normalizedChangeRate;

        await db.execute(
          `UPDATE \`${dbName}\`.payments SET v = v - ? WHERE ID = ?`,
          [settledAmount, row.ID],
        );

        await db.execute(
          `
            INSERT INTO \`${dbName}\`.paymentsde (
              Money,
              details,
              type,
              Name,
              Name_ID,
              dateIssued
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [paymentDiff, "", type, name, providerId, formattedDate],
        );

        remainingPayment -= settledAmount;
      }

      const [result] = await db.execute(
        `
          INSERT INTO \`${dbName}\`.payments (
            status,
            Inn,
            \`Out\`,
            type,
            Name,
            Name_ID,
            dateIssued
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ["Payment", normalizedAmount, "0", type, name, providerId, formattedDate],
      );

      if (account === SAFEBOX_ACCOUNT) {
        const [resultSafebox] = await db.execute(
          `
            INSERT INTO \`${dbName}\`.safeboxiqd (
              details,
              MoneyPaid,
              type,
              name,
              date
            )
            VALUES (?, -?, ?, ?, ?)
          `,
          [
            `Payment to ${name}`,
            normalizedIQDPayment,
            "Provider Payment",
            `(Change Rate: ${normalizedChangeRate}) (USD Payment: ${normalizedAmount})`,
            formattedDate,
          ],
        );

        await db.commit();

        return NextResponse.json({
          message: "Invoice and safebox entry added successfully",
          result,
          resultSafebox,
        });
      }

      const [result2] = await db.execute(
        `
          INSERT INTO \`${dbName}\`.dept (
            Name,
            Amount,
            state
          )
          VALUES (?, -?, ?)
        `,
        [account, normalizedIQDPayment, "In"],
      );

      await db.commit();

      return NextResponse.json({
        message: "Invoice and safebox entry added successfully",
        result,
        result2,
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

    console.error(error);
    return NextResponse.json(
      { error: "An error occurred while adding the invoice and safebox entry" },
      { status: 500 },
    );
  }
}
