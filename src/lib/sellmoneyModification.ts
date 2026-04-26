import { PoolConnection, RowDataPacket } from "mysql2/promise";

const ensuredSellMoneyModificationSchema = new Map<string, Promise<void>>();

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

export function isReceiptModified(value: unknown) {
  return value === "Y" || value === "y" || value === true || value === 1;
}

export async function ensureSellMoneyModificationSchemaReady(
  db: PoolConnection,
  dbName: string,
) {
  const existingTask = ensuredSellMoneyModificationSchema.get(dbName);
  if (existingTask) {
    await existingTask;
    return;
  }

  const task = (async () => {
    const [rows] = await db.query<ColumnRow[]>(
      `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'sellmoney'
          AND COLUMN_NAME IN (
            'is_modified',
            'modified_at',
            'modified_by',
            'modification_summary',
            'modification_confirmed',
            'modification_confirmed_at',
            'modification_confirmed_by',
            'modification_count'
          )
      `,
      [dbName],
    );

    const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
    const alterClauses: string[] = [];

    if (!existingColumns.has("is_modified")) {
      alterClauses.push("ADD COLUMN `is_modified` CHAR(1) NOT NULL DEFAULT 'N'");
    }

    if (!existingColumns.has("modified_at")) {
      alterClauses.push("ADD COLUMN `modified_at` DATETIME NULL");
    }

    if (!existingColumns.has("modified_by")) {
      alterClauses.push("ADD COLUMN `modified_by` VARCHAR(255) NULL");
    }

    if (!existingColumns.has("modification_summary")) {
      alterClauses.push("ADD COLUMN `modification_summary` LONGTEXT NULL");
    }

    if (!existingColumns.has("modification_confirmed")) {
      alterClauses.push("ADD COLUMN `modification_confirmed` CHAR(1) NOT NULL DEFAULT 'N'");
    }

    if (!existingColumns.has("modification_confirmed_at")) {
      alterClauses.push("ADD COLUMN `modification_confirmed_at` DATETIME NULL");
    }

    if (!existingColumns.has("modification_confirmed_by")) {
      alterClauses.push("ADD COLUMN `modification_confirmed_by` VARCHAR(255) NULL");
    }

    if (!existingColumns.has("modification_count")) {
      alterClauses.push("ADD COLUMN `modification_count` INT NOT NULL DEFAULT 0");
    }

    if (alterClauses.length > 0) {
      try {
        await db.query(`ALTER TABLE \`${dbName}\`.sellmoney ${alterClauses.join(", ")}`);
      } catch (error: any) {
        if (error?.code !== "ER_DUP_FIELDNAME") {
          throw error;
        }
      }
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`${dbName}\`.sellmoney_modification_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        invo_num VARCHAR(64) NOT NULL,
        action_type VARCHAR(20) NOT NULL,
        summary LONGTEXT NULL,
        payload LONGTEXT NULL,
        actor_name VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sellmoney_modification_history_invoice (invo_num),
        KEY idx_sellmoney_modification_history_created_at (created_at)
      )
    `);
  })();

  ensuredSellMoneyModificationSchema.set(dbName, task);

  try {
    await task;
  } catch (error) {
    ensuredSellMoneyModificationSchema.delete(dbName);
    throw error;
  }
}

interface HistoryInsertInput {
  invoNum: string;
  actionType: "modified" | "confirmed";
  summary: string;
  payload?: string | null;
  actorName?: string | null;
}

export async function insertSellMoneyModificationHistory(
  db: PoolConnection,
  dbName: string,
  input: HistoryInsertInput,
) {
  await db.execute(
    `
      INSERT INTO \`${dbName}\`.sellmoney_modification_history (
        invo_num,
        action_type,
        summary,
        payload,
        actor_name
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      input.invoNum,
      input.actionType,
      input.summary,
      input.payload ?? null,
      input.actorName ?? null,
    ],
  );
}
