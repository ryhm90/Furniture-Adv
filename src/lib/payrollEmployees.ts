import { PoolConnection, RowDataPacket } from "mysql2/promise";

const ensuredEmployeeColumns = new Map<string, Promise<void>>();

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string;
}

export async function ensurePayrollEmployeeColumns(db: PoolConnection, dbName: string) {
  const existingTask = ensuredEmployeeColumns.get(dbName);
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
          AND TABLE_NAME = 'employees'
          AND COLUMN_NAME IN ('salary_advance', 'is_active')
      `,
      [dbName],
    );

    const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));
    const alterClauses: string[] = [];

    if (!existingColumns.has("salary_advance")) {
      alterClauses.push("ADD COLUMN `salary_advance` DECIMAL(12,2) NOT NULL DEFAULT 0");
    }

    if (!existingColumns.has("is_active")) {
      alterClauses.push("ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1");
    }

    if (alterClauses.length === 0) {
      return;
    }

    try {
      await db.query(`ALTER TABLE \`${dbName}\`.employees ${alterClauses.join(", ")}`);
    } catch (error: any) {
      if (error?.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    }
  })();

  ensuredEmployeeColumns.set(dbName, task);

  try {
    await task;
  } catch (error) {
    ensuredEmployeeColumns.delete(dbName);
    throw error;
  }
}
