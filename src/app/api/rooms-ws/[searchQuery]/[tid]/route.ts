import { NextResponse } from "next/server";

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

export const dynamic = "force-dynamic";

const ALLOWED_TIERS = ["Tier1", "Tier2", "Tier3"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ searchQuery: string; tid: string }> },
) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const { searchQuery, tid } = await params;
    const requestUrl = new URL(_request.url);
    const affiliateId = Number.parseInt(requestUrl.searchParams.get("affiliateId") ?? "", 10);

    if (!searchQuery || !tid) {
      return NextResponse.json(
        { error: "Invalid search query or tid parameter." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TIERS.includes(tid)) {
      return NextResponse.json({ error: "Invalid tier parameter." }, { status: 400 });
    }

    const db = await pool.getConnection();

    try {
      await ensureAffiliatePriceTable(db, dbName);
      const tierField =
        Number.isFinite(affiliateId) && affiliateId > 0
          ? await getAffiliateTierField(db, dbName, affiliateId)
          : tid;

      const [rows] = await db.execute(
        `
          SELECT
            e.id,
            e.RoomName,
            e.RoomCounts,
            COALESCE(ap.price, e.\`${tierField}\`) AS Tier,
            e.\`${tierField}\` AS TierPrice,
            ap.price AS CustomPrice,
            CASE WHEN ap.price IS NULL THEN 'tier' ELSE 'custom' END AS priceSource,
            e.RoomCost
          FROM \`${dbName}\`.entrytable
          AS e
          LEFT JOIN \`${dbName}\`.affiliate_prices ap
            ON ap.roomID = e.id AND ap.affiliateID = ?
          WHERE (e.RoomName LIKE ? OR e.Namee LIKE ?) AND UPPER(e.wholesale) = ?
          ORDER BY e.id DESC
        `,
        [Number.isFinite(affiliateId) && affiliateId > 0 ? affiliateId : 0, `%${searchQuery}%`, `%${searchQuery}%`, "Y"],
      );

      return NextResponse.json(rows, { status: 200 });
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching data. Please try again later." },
      { status: 500 },
    );
  }
}
