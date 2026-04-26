import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import pool from "@/lib/mysql";
import {
  createSalesTelegramInboxEntry,
  ensureSalesTelegramInboxTable,
  isValidDbName,
} from "@/lib/salesTelegramInbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TelegramMessage = {
  message_id?: number;
  media_group_id?: string;
  text?: string;
  caption?: string;
  photo?: Array<{ file_id?: string; file_unique_id?: string }>;
  document?: {
    file_id?: string;
    file_name?: string;
    mime_type?: string;
  };
  from?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat?: {
    id?: number;
    title?: string;
  };
};

function resolveTelegramMessage(update: any): TelegramMessage | null {
  return (
    update?.message ??
    update?.edited_message ??
    update?.channel_post ??
    update?.edited_channel_post ??
    null
  );
}

function isAllowedTelegramFile(message: TelegramMessage) {
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    return true;
  }

  if (!message.document?.file_id) {
    return false;
  }

  const mimeType = String(message.document.mime_type ?? "").toLowerCase();
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function detectRequestType(text: string, hasAttachment: boolean) {
  const normalizedText = text.toLowerCase();

  if (
    normalizedText.includes("موعد") ||
    normalizedText.includes("تجهيز") ||
    normalizedText.includes("تغيير")
  ) {
    return "schedule_change";
  }

  if (
    normalizedText.includes("اونلاين") ||
    normalizedText.includes("online") ||
    normalizedText.includes("تحويل") ||
    normalizedText.includes("كي كارد") ||
    normalizedText.includes("zain") ||
    normalizedText.includes("asia")
  ) {
    return "online_receipt";
  }

  if (hasAttachment) {
    return "paper_receipt";
  }

  return "other";
}

function getSenderName(message: TelegramMessage) {
  const parts = [message.from?.first_name, message.from?.last_name]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return String(message.chat?.title ?? message.from?.username ?? "Telegram").trim();
}

function getTelegramSecretFromRequest(request: NextRequest) {
  return (
    request.headers.get("x-telegram-bot-api-secret-token") ??
    new URL(request.url).searchParams.get("secret") ??
    ""
  );
}

async function downloadTelegramFileToPublic(
  botToken: string,
  dbName: string,
  fileId: string,
  originalFileName?: string | null,
) {
  const fileInfoResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    { cache: "no-store" },
  );

  if (!fileInfoResponse.ok) {
    throw new Error("Failed to fetch Telegram file info.");
  }

  const fileInfo = await fileInfoResponse.json();
  const filePath = String(fileInfo?.result?.file_path ?? "");

  if (!filePath) {
    throw new Error("Telegram file path is missing.");
  }

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
    cache: "no-store",
  });

  if (!fileResponse.ok) {
    throw new Error("Failed to download Telegram file.");
  }

  const extension =
    path.extname(originalFileName ?? "") || path.extname(filePath) || ".jpg";
  const safeDbName = dbName.replace(/[^A-Za-z0-9_]/g, "_");
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const relativeDirectory = path.join("uploads", "telegram-sales", safeDbName);
  const publicDirectory = path.join(process.cwd(), "public", relativeDirectory);
  const outputPath = path.join(publicDirectory, fileName);

  await mkdir(publicDirectory, { recursive: true });
  await writeFile(outputPath, new Uint8Array(await fileResponse.arrayBuffer()));

  return `/${relativeDirectory.replace(/\\/g, "/")}/${fileName}`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ dbName: string }> },
) {
  try {
    const { dbName } = await context.params;

    if (!isValidDbName(dbName)) {
      return NextResponse.json({ message: "Invalid database name." }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const webhookSecret = process.env.TELEGRAM_SALES_WEBHOOK_SECRET?.trim();

    if (!botToken || !webhookSecret) {
      return NextResponse.json(
        { message: "Telegram webhook environment is not configured." },
        { status: 500 },
      );
    }

    if (getTelegramSecretFromRequest(request) !== webhookSecret) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const update = await request.json();
    const message = resolveTelegramMessage(update);

    if (!message) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const messageText = String(message.caption ?? message.text ?? "").trim();
    const hasAttachment = isAllowedTelegramFile(message);
    const attachmentPaths: string[] = [];

    if (Array.isArray(message.photo) && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];

      if (largestPhoto?.file_id) {
        attachmentPaths.push(
          await downloadTelegramFileToPublic(botToken, dbName, largestPhoto.file_id, ".jpg"),
        );
      }
    } else if (message.document?.file_id && hasAttachment) {
      attachmentPaths.push(
        await downloadTelegramFileToPublic(
          botToken,
          dbName,
          message.document.file_id,
          message.document.file_name,
        ),
      );
    }

    const db = await pool.getConnection();

    try {
      await ensureSalesTelegramInboxTable(db, dbName);
      await createSalesTelegramInboxEntry(db, dbName, {
        telegramUpdateId: update?.update_id ?? null,
        telegramChatId: message.chat?.id ?? null,
        telegramMessageId: message.message_id ?? null,
        mediaGroupId: message.media_group_id ?? null,
        senderName: getSenderName(message),
        senderUsername: message.from?.username ?? "",
        requestType: detectRequestType(messageText, attachmentPaths.length > 0),
        requestText: messageText,
        attachmentPaths,
      });
    } finally {
      db.release();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error processing Telegram sales webhook:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
