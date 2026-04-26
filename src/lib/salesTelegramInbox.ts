import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

const ensuredSalesTelegramInboxTables = new Map<string, Promise<void>>();

export type TelegramInboxStatusFilter = "all" | "pending" | "executed";

export interface SalesTelegramInboxRow extends RowDataPacket {
  id: number;
  telegram_update_id: number | null;
  telegram_chat_id: number | null;
  telegram_message_id: number | null;
  media_group_id: string | null;
  sender_name: string;
  sender_username: string;
  request_type: string;
  request_text: string | null;
  attachment_paths: string | null;
  is_executed: "Y" | "N";
  executed_at: Date | string | null;
  executed_by: string | null;
  linked_invo_num: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SalesTelegramInboxItem {
  id: number;
  telegramUpdateId: number | null;
  telegramChatId: number | null;
  telegramMessageId: number | null;
  mediaGroupId: string | null;
  senderName: string;
  senderUsername: string;
  requestType: string;
  requestText: string;
  attachmentPaths: string[];
  isExecuted: boolean;
  executedAt: string | null;
  executedBy: string | null;
  linkedInvoiceNumber: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SalesTelegramInboxSummary {
  all: number;
  pending: number;
  executed: number;
}

export interface CreateSalesTelegramInboxInput {
  telegramUpdateId?: number | null;
  telegramChatId?: number | null;
  telegramMessageId?: number | null;
  mediaGroupId?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  requestType: string;
  requestText?: string | null;
  attachmentPaths?: string[];
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeAttachmentPaths(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((item) => typeof item === "string" && item.trim())
      : [];
  } catch {
    return [];
  }
}

export function normalizeTelegramInboxStatusFilter(value: unknown): TelegramInboxStatusFilter {
  if (value === "executed") {
    return "executed";
  }

  if (value === "all") {
    return "all";
  }

  return "pending";
}

export function isValidDbName(dbName: string) {
  return /^[A-Za-z0-9_]+$/.test(dbName);
}

export async function ensureSalesTelegramInboxTable(db: PoolConnection, dbName: string) {
  const existingTask = ensuredSalesTelegramInboxTables.get(dbName);
  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`${dbName}\`.sales_telegram_inbox (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        telegram_update_id BIGINT NULL,
        telegram_chat_id BIGINT NULL,
        telegram_message_id BIGINT NULL,
        media_group_id VARCHAR(120) NULL,
        sender_name VARCHAR(255) NOT NULL DEFAULT '',
        sender_username VARCHAR(255) NOT NULL DEFAULT '',
        request_type VARCHAR(50) NOT NULL DEFAULT 'other',
        request_text TEXT NULL,
        attachment_paths LONGTEXT NULL,
        is_executed CHAR(1) NOT NULL DEFAULT 'N',
        executed_at DATETIME NULL,
        executed_by VARCHAR(255) NULL,
        linked_invo_num VARCHAR(60) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY telegram_update_unique (telegram_update_id),
        KEY sales_telegram_inbox_status_idx (is_executed, created_at),
        KEY sales_telegram_inbox_linked_invoice_idx (linked_invo_num)
      )
    `);
  })();

  ensuredSalesTelegramInboxTables.set(dbName, task);

  try {
    await task;
  } catch (error) {
    ensuredSalesTelegramInboxTables.delete(dbName);
    throw error;
  }
}

export function mapSalesTelegramInboxRow(row: SalesTelegramInboxRow): SalesTelegramInboxItem {
  return {
    id: Number(row.id),
    telegramUpdateId: row.telegram_update_id == null ? null : Number(row.telegram_update_id),
    telegramChatId: row.telegram_chat_id == null ? null : Number(row.telegram_chat_id),
    telegramMessageId: row.telegram_message_id == null ? null : Number(row.telegram_message_id),
    mediaGroupId: row.media_group_id ?? null,
    senderName: row.sender_name ?? "",
    senderUsername: row.sender_username ?? "",
    requestType: row.request_type ?? "other",
    requestText: row.request_text ?? "",
    attachmentPaths: normalizeAttachmentPaths(row.attachment_paths),
    isExecuted: row.is_executed === "Y",
    executedAt: toIsoString(row.executed_at),
    executedBy: row.executed_by ?? null,
    linkedInvoiceNumber: row.linked_invo_num ?? null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function createSalesTelegramInboxEntry(
  db: PoolConnection,
  dbName: string,
  input: CreateSalesTelegramInboxInput,
) {
  await ensureSalesTelegramInboxTable(db, dbName);

  const [result] = await db.execute<ResultSetHeader>(
    `
      INSERT INTO \`${dbName}\`.sales_telegram_inbox (
        telegram_update_id,
        telegram_chat_id,
        telegram_message_id,
        media_group_id,
        sender_name,
        sender_username,
        request_type,
        request_text,
        attachment_paths
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `,
    [
      input.telegramUpdateId ?? null,
      input.telegramChatId ?? null,
      input.telegramMessageId ?? null,
      input.mediaGroupId ?? null,
      input.senderName?.trim() ?? "",
      input.senderUsername?.trim() ?? "",
      input.requestType || "other",
      input.requestText?.trim() ?? "",
      JSON.stringify(input.attachmentPaths ?? []),
    ],
  );

  return result.insertId;
}

export async function listSalesTelegramInbox(
  db: PoolConnection,
  dbName: string,
  status: TelegramInboxStatusFilter,
) {
  await ensureSalesTelegramInboxTable(db, dbName);

  const whereClause =
    status === "pending"
      ? "WHERE is_executed = 'N'"
      : status === "executed"
        ? "WHERE is_executed = 'Y'"
        : "";

  const [rows] = await db.query<SalesTelegramInboxRow[]>(
    `
      SELECT *
      FROM \`${dbName}\`.sales_telegram_inbox
      ${whereClause}
      ORDER BY is_executed ASC, created_at DESC
      LIMIT 250
    `,
  );

  const [summaryRows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN is_executed = 'N' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN is_executed = 'Y' THEN 1 ELSE 0 END) AS executed_count
      FROM \`${dbName}\`.sales_telegram_inbox
    `,
  );

  const summaryRow = summaryRows[0] as
    | { total_count?: number; pending_count?: number; executed_count?: number }
    | undefined;

  return {
    items: rows.map(mapSalesTelegramInboxRow),
    summary: {
      all: Number(summaryRow?.total_count ?? 0),
      pending: Number(summaryRow?.pending_count ?? 0),
      executed: Number(summaryRow?.executed_count ?? 0),
    } satisfies SalesTelegramInboxSummary,
  };
}

export async function updateSalesTelegramInboxStatus(
  db: PoolConnection,
  dbName: string,
  id: number,
  isExecuted: boolean,
  executedBy?: string | null,
  linkedInvoiceNumber?: string | null,
) {
  await ensureSalesTelegramInboxTable(db, dbName);

  await db.execute(
    `
      UPDATE \`${dbName}\`.sales_telegram_inbox
      SET
        is_executed = ?,
        executed_at = ?,
        executed_by = ?,
        linked_invo_num = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      isExecuted ? "Y" : "N",
      isExecuted ? new Date() : null,
      isExecuted ? executedBy?.trim() ?? "" : null,
      isExecuted ? linkedInvoiceNumber?.trim() ?? null : null,
      id,
    ],
  );
}
