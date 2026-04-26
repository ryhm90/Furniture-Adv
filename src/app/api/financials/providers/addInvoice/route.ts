import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const IN_PRODUCTION_STATUS = "\u0641\u064A \u0627\u0644\u062A\u0635\u0646\u064A\u0639";

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
    const { providerName, providerId, itemName, factoryName, agreedCount, factoryPrice, date } =
      body;

    if (
      !providerName ||
      !providerId ||
      !itemName ||
      !factoryName ||
      !agreedCount ||
      !factoryPrice ||
      !date
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const formattedFactoryPrice =
      typeof factoryPrice === "string"
        ? Number.parseFloat(factoryPrice.replace(/,/g, ""))
        : factoryPrice;

    if (!Number.isFinite(formattedFactoryPrice)) {
      return NextResponse.json({ error: "Invalid factory price" }, { status: 400 });
    }

    const formattedDate = new Date(date);
    const mysqlFormattedDate = formattedDate.toLocaleDateString("en-CA");

    const result = await executeQuery(
      `
        INSERT INTO \`${dbName}\`.providorsde (
          ID_providor,
          ItemName,
          factoryName,
          agreedCount,
          factoryPrice,
          date,
          providorName,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        providerId,
        itemName,
        factoryName,
        agreedCount,
        formattedFactoryPrice,
        mysqlFormattedDate,
        providerName,
        IN_PRODUCTION_STATUS,
      ],
    );

    return NextResponse.json({ message: "Invoice added successfully", result });
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
