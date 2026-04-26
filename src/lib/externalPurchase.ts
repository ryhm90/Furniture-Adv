import { PoolConnection, RowDataPacket } from "mysql2/promise";

const ensuredEntrytableColumns = new Map<string, Promise<void>>();
const ensuredSelltableColumns = new Map<string, Promise<void>>();

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

export function normalizeExternalPurchaseFlag(value: unknown): "Y" | "N" {
  if (value === true || value === "Y" || value === "y" || value === "true" || value === 1) {
    return "Y";
  }

  return "N";
}

export function isExternalPurchaseEnabled(value: unknown) {
  return normalizeExternalPurchaseFlag(value) === "Y";
}

export function normalizeFinancialAccountName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

export async function ensureEntrytableExternalPurchaseColumns(
  db: PoolConnection,
  dbName: string,
) {
  const existingTask = ensuredEntrytableColumns.get(dbName);
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
          AND TABLE_NAME = 'entrytable'
          AND COLUMN_NAME IN ('ExternalPurchase', 'FinancialAccount')
      `,
      [dbName],
    );

    const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
    const alterClauses: string[] = [];

    if (!existingColumns.has("ExternalPurchase")) {
      alterClauses.push("ADD COLUMN `ExternalPurchase` CHAR(1) NOT NULL DEFAULT 'N'");
    }

    if (!existingColumns.has("FinancialAccount")) {
      alterClauses.push("ADD COLUMN `FinancialAccount` VARCHAR(255) NULL");
    }

    if (alterClauses.length === 0) {
      return;
    }

    try {
      await db.query(`ALTER TABLE \`${dbName}\`.entrytable ${alterClauses.join(", ")}`);
    } catch (error: any) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  })();

  ensuredEntrytableColumns.set(dbName, task);

  try {
    await task;
  } catch (error) {
    ensuredEntrytableColumns.delete(dbName);
    throw error;
  }
}

export async function ensureSelltableExternalPurchaseColumns(
  db: PoolConnection,
  dbName: string,
) {
  const existingTask = ensuredSelltableColumns.get(dbName);
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
          AND TABLE_NAME = 'selltable'
          AND COLUMN_NAME IN ('ExternalPurchase', 'FinancialAccount')
      `,
      [dbName],
    );

    const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
    const alterClauses: string[] = [];

    if (!existingColumns.has("ExternalPurchase")) {
      alterClauses.push("ADD COLUMN `ExternalPurchase` CHAR(1) NOT NULL DEFAULT 'N'");
    }

    if (!existingColumns.has("FinancialAccount")) {
      alterClauses.push("ADD COLUMN `FinancialAccount` VARCHAR(255) NULL");
    }

    if (alterClauses.length === 0) {
      return;
    }

    try {
      await db.query(`ALTER TABLE \`${dbName}\`.selltable ${alterClauses.join(", ")}`);
    } catch (error: any) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  })();

  ensuredSelltableColumns.set(dbName, task);

  try {
    await task;
  } catch (error) {
    ensuredSelltableColumns.delete(dbName);
    throw error;
  }
}
