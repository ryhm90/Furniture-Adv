import { RowDataPacket } from "mysql2/promise";
import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { consumePublicRateLimit } from "@/lib/publicRateLimit";

interface AffiliateSummaryRow extends RowDataPacket {
  Id: number;
  Clname: string;
  affiliate: string;
  username: string;
  TiD: string | null;
  totalMPU: number | string | null;
}

interface StatementRow extends RowDataPacket {
  Id: number;
  Invonum: string;
  date: string | Date | null;
  Driver: string | null;
  Provin: string | null;
  Provin2: string | null;
  Por: string | null;
  MPU: number | string;
  De: string | null;
  countt: number | string | null;
  RoomNames: string | null;
}

const USERNAME_PATTERN = /^[A-Za-z0-9]{8,32}$/;
const PUBLIC_LIMIT = 40;
const PUBLIC_WINDOW_MS = 10 * 60 * 1000;

export const dynamic = "force-dynamic";

function applyCommonHeaders(response: NextResponse, remaining?: number, retryAfter?: number) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (remaining !== undefined) {
    response.headers.set("X-RateLimit-Remaining", String(remaining));
  }

  if (retryAfter !== undefined) {
    response.headers.set("Retry-After", String(retryAfter));
  }

  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  if (!USERNAME_PATTERN.test(username)) {
    return applyCommonHeaders(
      NextResponse.json({ error: "Invalid public link." }, { status: 400 }),
    );
  }

  const rateLimitResult = consumePublicRateLimit(
    request,
    `public-wholesale:${username}`,
    PUBLIC_LIMIT,
    PUBLIC_WINDOW_MS,
  );

  if (!rateLimitResult.allowed) {
    return applyCommonHeaders(
      NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        { status: 429 },
      ),
      rateLimitResult.remaining,
      rateLimitResult.retryAfterSeconds,
    );
  }

  const dbName = process.env.MYSQL_DATABASE;
  if (!dbName) {
    return applyCommonHeaders(
      NextResponse.json({ error: "Database is not configured." }, { status: 500 }),
      rateLimitResult.remaining,
    );
  }

  const db = await pool.getConnection();

  try {
    const [affiliateRows] = await db.query<AffiliateSummaryRow[]>(
      `
        SELECT
          a.Id,
          a.Clname,
          a.affiliate,
          a.username,
          a.TiD,
          COALESCE(
            (
              SELECT SUM(p.MPU)
              FROM \`${dbName}\`.affiliatepu p
              WHERE p.affiliateID = a.Id OR (p.affiliateID IS NULL AND p.affiliate = a.affiliate)
            ),
            0
          ) AS totalMPU
        FROM \`${dbName}\`.affiliate a
        WHERE a.username = ?
        LIMIT 1
      `,
      [username],
    );

    const affiliate = affiliateRows[0];
    if (!affiliate) {
      return applyCommonHeaders(
        NextResponse.json({ error: "Customer page not found." }, { status: 404 }),
        rateLimitResult.remaining,
      );
    }

    const [statementRows] = await db.query<StatementRow[]>(
      `
        SELECT
          epu.Id,
          epu.Invonum,
          epu.date,
          sm.Driver,
          sm.Provin,
          sm.Provin2,
          sm.Por,
          epu.MPU,
          epu.De,
          COALESCE(SUM(st.countt), 0) AS countt,
          GROUP_CONCAT(DISTINCT et.RoomName ORDER BY et.RoomName SEPARATOR ', ') AS RoomNames
        FROM \`${dbName}\`.affiliatepu epu
        LEFT JOIN \`${dbName}\`.sellmoney sm ON epu.Invonum = sm.Invonum
        LEFT JOIN \`${dbName}\`.selltable st ON sm.Invonum = st.Invonum
        LEFT JOIN \`${dbName}\`.entrytable et ON st.RoomNum = et.id
        WHERE
          (epu.affiliateID = ? OR (epu.affiliateID IS NULL AND epu.affiliate = ?))
          AND epu.MPU <> 0
        GROUP BY
          epu.Id,
          epu.Invonum,
          epu.date,
          sm.Driver,
          sm.Provin,
          sm.Provin2,
          sm.Por,
          epu.MPU,
          epu.De
        ORDER BY epu.date ASC, epu.Id ASC
      `,
      [affiliate.Id, affiliate.affiliate],
    );

    const response = NextResponse.json(
      {
        affiliate: {
          Clname: affiliate.Clname,
          affiliate: affiliate.affiliate,
          username: affiliate.username,
          TiD: affiliate.TiD,
          totalMPU: Number(affiliate.totalMPU ?? 0),
        },
        items: statementRows.map((row) => ({
          Id: row.Id,
          Invonum: row.Invonum,
          date: row.date,
          Driver: row.Driver,
          Provin: row.Provin,
          Provin2: row.Provin2,
          Por: row.Por,
          MPU: Number(row.MPU ?? 0),
          De: row.De,
          countt: Number(row.countt ?? 0),
          RoomNames: row.RoomNames ?? "",
        })),
      },
      { status: 200 },
    );

    return applyCommonHeaders(response, rateLimitResult.remaining);
  } catch (error) {
    console.error("Error fetching public wholesale statement:", error);
    return applyCommonHeaders(
      NextResponse.json({ error: "Failed to load customer statement." }, { status: 500 }),
      rateLimitResult.remaining,
    );
  } finally {
    db.release();
  }
}
