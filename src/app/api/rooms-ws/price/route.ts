import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import {
  ensureAffiliatePriceTable,
  getAffiliateTierField,
} from "@/lib/affiliatePricing";
import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface PriceRow extends RowDataPacket {
  roomId: number;
  unitPrice: number;
  tierPrice: number;
  customPrice: number | null;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { searchParams } = new URL(request.url);
    const roomId = Number.parseInt(searchParams.get("roomId") ?? "", 10);
    const affiliateId = Number.parseInt(searchParams.get("affiliateId") ?? "", 10);

    if (
      !Number.isFinite(roomId) ||
      roomId <= 0 ||
      !Number.isFinite(affiliateId) ||
      affiliateId <= 0
    ) {
      return NextResponse.json({ error: "Invalid room or affiliate id" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureAffiliatePriceTable(db, dbName);
      const tierField = await getAffiliateTierField(db, dbName, affiliateId);

      const [rows] = await db.query<PriceRow[]>(
        `
          SELECT
            e.id AS roomId,
            COALESCE(ap.price, e.\`${tierField}\`) AS unitPrice,
            e.\`${tierField}\` AS tierPrice,
            ap.price AS customPrice
          FROM \`${dbName}\`.entrytable e
          LEFT JOIN \`${dbName}\`.affiliate_prices ap
            ON ap.roomID = e.id AND ap.affiliateID = ?
          WHERE e.id = ? AND UPPER(e.wholesale) = 'Y'
          LIMIT 1
        `,
        [affiliateId, roomId],
      );

      const row = rows[0];
      if (!row) {
        return NextResponse.json({ error: "Wholesale item not found" }, { status: 404 });
      }

      return NextResponse.json(
        {
          roomId: row.roomId,
          unitPrice: Number(row.unitPrice),
          tierPrice: Number(row.tierPrice),
          customPrice: row.customPrice == null ? null : Number(row.customPrice),
          priceSource: row.customPrice == null ? "tier" : "custom",
        },
        { status: 200 },
      );
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching wholesale price for affiliate:", error);
    return NextResponse.json({ error: "Failed to fetch wholesale price" }, { status: 500 });
  }
}
