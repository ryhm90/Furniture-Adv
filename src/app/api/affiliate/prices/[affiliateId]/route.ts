import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import {
  ensureAffiliatePriceTable,
  normalizeWholesaleTierField,
} from "@/lib/affiliatePricing";
import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface AffiliateRow extends RowDataPacket {
  Id: number;
  affiliate: string;
  TiD: string;
}

function parseMoney(value: string | number | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseFloat(value.replace(/,/g, ""));
  }

  return Number.NaN;
}

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { affiliateId } = await params;
    const parsedAffiliateId = Number.parseInt(affiliateId, 10);

    if (!Number.isFinite(parsedAffiliateId) || parsedAffiliateId <= 0) {
      return NextResponse.json({ error: "Invalid affiliate id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";
    const db = await pool.getConnection();

    try {
      await ensureAffiliatePriceTable(db, dbName);

      const [affiliateRows] = await db.query<AffiliateRow[]>(
        `SELECT Id, affiliate, TiD FROM \`${dbName}\`.affiliate WHERE Id = ? LIMIT 1`,
        [parsedAffiliateId],
      );

      const affiliate = affiliateRows[0];
      if (!affiliate) {
        return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
      }

      const tierField = normalizeWholesaleTierField(affiliate.TiD);

      let items;

      if (query) {
        [items] = await db.query(
          `
            SELECT
              e.id AS roomId,
              e.RoomName,
              e.RoomCounts,
              e.\`${tierField}\` AS tierPrice,
              ap.price AS customPrice,
              COALESCE(ap.price, e.\`${tierField}\`) AS effectivePrice,
              CASE WHEN ap.price IS NULL THEN 'tier' ELSE 'custom' END AS priceSource,
              ap.Updated_at
            FROM \`${dbName}\`.entrytable e
            LEFT JOIN \`${dbName}\`.affiliate_prices ap
              ON ap.roomID = e.id AND ap.affiliateID = ?
            WHERE UPPER(e.wholesale) = 'Y' AND (e.RoomName LIKE ? OR e.Namee LIKE ?)
            ORDER BY e.id DESC
          `,
          [parsedAffiliateId, `%${query}%`, `%${query}%`],
        );
      } else {
        [items] = await db.query(
          `
            SELECT
              e.id AS roomId,
              e.RoomName,
              e.RoomCounts,
              e.\`${tierField}\` AS tierPrice,
              ap.price AS customPrice,
              COALESCE(ap.price, e.\`${tierField}\`) AS effectivePrice,
              'custom' AS priceSource,
              ap.Updated_at
            FROM \`${dbName}\`.affiliate_prices ap
            INNER JOIN \`${dbName}\`.entrytable e ON e.id = ap.roomID
            WHERE ap.affiliateID = ? AND UPPER(e.wholesale) = 'Y'
            ORDER BY ap.Updated_at DESC, e.id DESC
          `,
          [parsedAffiliateId],
        );
      }

      return NextResponse.json(
        {
          affiliate,
          items,
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

    console.error("Error fetching affiliate price overrides:", error);
    return NextResponse.json({ error: "Failed to fetch affiliate prices" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { affiliateId } = await params;
    const parsedAffiliateId = Number.parseInt(affiliateId, 10);
    const { roomId, price } = await request.json();

    const parsedRoomId = Number.parseInt(String(roomId), 10);
    const parsedPrice = parseMoney(price);

    if (
      !Number.isFinite(parsedAffiliateId) ||
      parsedAffiliateId <= 0 ||
      !Number.isFinite(parsedRoomId) ||
      parsedRoomId <= 0 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      return NextResponse.json({ error: "Invalid affiliate, room, or price" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureAffiliatePriceTable(db, dbName);

      await db.query(
        `
          INSERT INTO \`${dbName}\`.affiliate_prices (affiliateID, roomID, price)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            price = VALUES(price),
            Updated_at = CURRENT_TIMESTAMP
        `,
        [parsedAffiliateId, parsedRoomId, parsedPrice],
      );

      return NextResponse.json({ message: "Custom price saved successfully" }, { status: 200 });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error saving affiliate price override:", error);
    return NextResponse.json({ error: "Failed to save affiliate price" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { affiliateId } = await params;
    const parsedAffiliateId = Number.parseInt(affiliateId, 10);
    const { roomId } = await request.json();
    const parsedRoomId = Number.parseInt(String(roomId), 10);

    if (
      !Number.isFinite(parsedAffiliateId) ||
      parsedAffiliateId <= 0 ||
      !Number.isFinite(parsedRoomId) ||
      parsedRoomId <= 0
    ) {
      return NextResponse.json({ error: "Invalid affiliate or room id" }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureAffiliatePriceTable(db, dbName);

      await db.query(
        `DELETE FROM \`${dbName}\`.affiliate_prices WHERE affiliateID = ? AND roomID = ?`,
        [parsedAffiliateId, parsedRoomId],
      );

      return NextResponse.json({ message: "Custom price deleted successfully" }, { status: 200 });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error deleting affiliate price override:", error);
    return NextResponse.json({ error: "Failed to delete affiliate price" }, { status: 500 });
  }
}
