import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import { consumePublicRateLimit } from "@/lib/publicRateLimit";
import {
  createSalesTelegramInboxEntry,
  ensureSalesTelegramInboxTable,
  isValidDbName,
} from "@/lib/salesTelegramInbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBLIC_LIMIT = 8;
const PUBLIC_WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTACHMENTS = 4;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MIN_FILL_SECONDS = 3;
const ALLOWED_REQUEST_TYPES = new Set([
  "paper_receipt",
  "online_receipt",
  "schedule_change",
  "other",
]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

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

async function savePublicAttachment(dbName: string, file: File) {
  const safeDbName = dbName.replace(/[^A-Za-z0-9_]/g, "_");
  const extension = path.extname(file.name || "") || ".bin";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const relativeDirectory = path.join("uploads", "public-sales-request", safeDbName);
  const publicDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const outputPath = path.join(publicDirectory, fileName);

  await mkdir(publicDirectory, { recursive: true });
  await writeFile(outputPath, new Uint8Array(await file.arrayBuffer()));

  return `/${relativeDirectory.replace(/\\/g, "/")}/${fileName}`;
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dbName: string }> },
) {
  const { dbName } = await context.params;

  if (!isValidDbName(dbName)) {
    return applyCommonHeaders(
      NextResponse.json({ message: "Invalid database name." }, { status: 400 }),
    );
  }

  const rateLimitResult = consumePublicRateLimit(
    request,
    `public-sales-request:${dbName}`,
    PUBLIC_LIMIT,
    PUBLIC_WINDOW_MS,
  );

  if (!rateLimitResult.allowed) {
    return applyCommonHeaders(
      NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        { status: 429 },
      ),
      rateLimitResult.remaining,
      rateLimitResult.retryAfterSeconds,
    );
  }

  try {
    const formData = await request.formData();
    const senderName = normalizeText(formData.get("senderName"));
    const phoneNumber = normalizeText(formData.get("phoneNumber"));
    const requestType = normalizeText(formData.get("requestType"));
    const requestText = normalizeText(formData.get("requestText"));
    const honeypot = normalizeText(formData.get("website"));
    const startedAt = Number.parseInt(normalizeText(formData.get("startedAt")), 10);
    const attachments = formData
      .getAll("attachments")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (honeypot) {
      return applyCommonHeaders(
        NextResponse.json({ ok: true }, { status: 200 }),
        rateLimitResult.remaining,
      );
    }

    if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_SECONDS * 1000) {
      return applyCommonHeaders(
        NextResponse.json({ message: "Request rejected." }, { status: 400 }),
        rateLimitResult.remaining,
      );
    }

    if (!senderName || !ALLOWED_REQUEST_TYPES.has(requestType)) {
      return applyCommonHeaders(
        NextResponse.json({ message: "Missing required fields." }, { status: 400 }),
        rateLimitResult.remaining,
      );
    }

    if (attachments.length === 0) {
      return applyCommonHeaders(
        NextResponse.json({ message: "At least one attachment is required." }, { status: 400 }),
        rateLimitResult.remaining,
      );
    }

    if (attachments.length > MAX_ATTACHMENTS) {
      return applyCommonHeaders(
        NextResponse.json({ message: "Too many attachments." }, { status: 400 }),
        rateLimitResult.remaining,
      );
    }

    for (const attachment of attachments) {
      if (attachment.size > MAX_FILE_SIZE || !ALLOWED_MIME_TYPES.has(attachment.type)) {
        return applyCommonHeaders(
          NextResponse.json({ message: "Invalid attachment detected." }, { status: 400 }),
          rateLimitResult.remaining,
        );
      }
    }

    const attachmentPaths: string[] = [];
    for (const attachment of attachments) {
      attachmentPaths.push(await savePublicAttachment(dbName, attachment));
    }

    const composedText = [
      phoneNumber ? `رقم الهاتف: ${phoneNumber}` : "",
      requestText,
    ]
      .filter(Boolean)
      .join("\n\n");

    const db = await pool.getConnection();

    try {
      await ensureSalesTelegramInboxTable(db, dbName);
      await createSalesTelegramInboxEntry(db, dbName, {
        senderName,
        senderUsername: "public-form",
        requestType,
        requestText: composedText,
        attachmentPaths,
      });
    } finally {
      db.release();
    }

    return applyCommonHeaders(
      NextResponse.json({ message: "Request submitted successfully." }, { status: 200 }),
      rateLimitResult.remaining,
    );
  } catch (error) {
    console.error("Error creating public sales request:", error);
    return applyCommonHeaders(
      NextResponse.json({ message: "Internal server error." }, { status: 500 }),
      rateLimitResult.remaining,
    );
  }
}
