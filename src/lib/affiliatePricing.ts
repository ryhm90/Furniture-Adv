import { PoolConnection, RowDataPacket } from "mysql2/promise";

export const WHOLESALE_TIERS = ["Tier1", "Tier2", "Tier3"] as const;

export type WholesaleTierField = (typeof WHOLESALE_TIERS)[number];

interface AffiliateTierRow extends RowDataPacket {
  TiD: string | null;
}

const ensuredAffiliatePriceTables = new Map<string, Promise<void>>();

export function normalizeWholesaleTierField(value: unknown): WholesaleTierField {
  return WHOLESALE_TIERS.includes(value as WholesaleTierField)
    ? (value as WholesaleTierField)
    : "Tier1";
}

export async function ensureAffiliatePriceTable(db: PoolConnection, dbName: string) {
  const existingTask = ensuredAffiliatePriceTables.get(dbName);
  if (existingTask) {
    await existingTask;
    return;
  }

  const task = db.query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.affiliate_prices (
      ID INT NOT NULL AUTO_INCREMENT,
      affiliateID INT NOT NULL,
      roomID INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      Created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      Updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (ID),
      UNIQUE KEY unique_affiliate_room (affiliateID, roomID),
      KEY idx_affiliate_prices_affiliate (affiliateID),
      KEY idx_affiliate_prices_room (roomID)
    )
  `);

  ensuredAffiliatePriceTables.set(dbName, task.then(() => undefined));

  try {
    await task;
  } catch (error) {
    ensuredAffiliatePriceTables.delete(dbName);
    throw error;
  }
}

export async function getAffiliateTierField(
  db: PoolConnection,
  dbName: string,
  affiliateId: number,
) {
  const [rows] = await db.query<AffiliateTierRow[]>(
    `SELECT TiD FROM \`${dbName}\`.affiliate WHERE Id = ? LIMIT 1`,
    [affiliateId],
  );

  return normalizeWholesaleTierField(rows[0]?.TiD);
}
