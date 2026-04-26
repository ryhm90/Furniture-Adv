import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";

import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

function normalizeAmount(value: unknown) {
  const numericValue = Number(String(value ?? "0").replace(/,/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Accountant"]);
    const dbName = getDbNameFromSession(session);
    const { galleryRent, warehouseRent, rentDate } = await request.json();

    if (typeof rentDate !== "string" || !/^\d{4}-\d{2}$/.test(rentDate.trim())) {
      return NextResponse.json(
        { message: "A valid rent month is required." },
        { status: 400 },
      );
    }

    const normalizedGalleryRent = normalizeAmount(galleryRent);
    const normalizedWarehouseRent = normalizeAmount(warehouseRent);

    if (normalizedGalleryRent <= 0 && normalizedWarehouseRent <= 0) {
      return NextResponse.json(
        { message: "At least one rent amount must be greater than zero." },
        { status: 400 },
      );
    }

    const rentDateWithDay = `${rentDate.trim()}-01`;
    const db = await pool.getConnection();

    try {
      await db.beginTransaction();

      const query = `
        INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, date)
        VALUES (?, -?, ?, ?)
      `;

      if (normalizedGalleryRent > 0) {
        await db.execute<ResultSetHeader>(query, [
          "Gallery Rent",
          normalizedGalleryRent,
          "Rent Record",
          rentDateWithDay,
        ]);
      }

      if (normalizedWarehouseRent > 0) {
        await db.execute<ResultSetHeader>(query, [
          "Warehouse Rent",
          normalizedWarehouseRent,
          "Rent Record",
          rentDateWithDay,
        ]);
      }

      await db.commit();
      return NextResponse.json({
        message: "Rent record saved successfully.",
        createdItems: [normalizedGalleryRent > 0, normalizedWarehouseRent > 0].filter(Boolean)
          .length,
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

    console.error("Error saving rent record:", error);
    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 },
    );
  }
}
