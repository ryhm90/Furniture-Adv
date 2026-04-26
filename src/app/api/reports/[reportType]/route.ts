// File: src/app/api/reports/[reportType]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import pool from '@/lib/mysql';
import { ensureSellMoneyModificationSchemaReady } from '@/lib/sellmoneyModification';
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

type Filters = Record<string, string | number | undefined>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reportType: string }> }
) {
  const { reportType } = await params;
  const { filters = {} as Filters } = await req.json();
  if (!reportType) {
    return NextResponse.json({ error: 'Missing report type' }, { status: 400 });
  }

  const session = await requireRole(["Manager"]);
  const dbName = getDbNameFromSession(session);
  const db = await pool.getConnection();
  const t = (tbl: string) => `\`${dbName}\`.\`${tbl}\``;
  const sqlParts: string[] = [];
  const values: (string | number)[] = [];

  try {
    // ═══ SALES / DELIVERY / WHOLESALE ═══
    if (['sales', 'delivery', 'wholesale'].includes(reportType)) {
      const byDate =
        reportType === 'sales'    ? 'sm.created_at' :
        reportType === 'delivery' ? 'sm.provide'    :
        reportType === 'wholesale' ? 'sm.provide'    :

                                     'sm.created_at';

      sqlParts.push(`
        SELECT
          sm.id,
          sm.Invonum,
          sm.ClName,
          sm.sum,
          sm.MoneyRemain,
          CONCAT(sm.Provin,' ',sm.Provin2) AS ProvinS,
          sm.por,
          CONCAT(sm.CellPhone,' ',sm.CellPhone1) AS CellPhone,
          sm.warehouseS,
          GROUP_CONCAT(et.RoomName SEPARATOR ', ') AS RoomNames,
          ${byDate} AS reportDate,
          sm.sellor,
          sm.wholesale
        FROM ${t('sellmoney')} sm
        LEFT JOIN ${t('selltable')} st ON sm.Invonum = st.Invonum
        LEFT JOIN ${t('entrytable')} et ON st.RoomNum = et.id
        WHERE ${byDate} BETWEEN ? AND ?
          AND sm.por <> 'ملغى'
          ${reportType === 'wholesale' ? "AND sm.wholesale = 'Y'" : ''}
      `);
      values.push(filters.startDate as string, filters.endDate as string);

      if (filters.employee) {
        sqlParts.push('AND sm.sellor = ?');
        values.push(filters.employee as string);
      }
      if (reportType === 'delivery' && filters.warehouseState) {
        sqlParts.push('AND sm.warehouseS = ?');
        values.push(filters.warehouseState as string);
      }
      if (reportType === 'delivery' && filters.roomQuery) {
        sqlParts.push('AND et.RoomName LIKE ?');
        values.push(`%${filters.roomQuery}%`);
      }

      sqlParts.push(`
        GROUP BY sm.Invonum, reportDate, sm.id
        ORDER BY reportDate ASC
      `);
    }
    // ═══ INVENTORY / TIAR ═══
    else if (reportType === 'modified_receipts') {
      await ensureSellMoneyModificationSchemaReady(db, dbName);

      sqlParts.push(`
        SELECT
          sm.InvoNum,
          sm.ClName,
          sm.Sum,
          sm.MoneyRemain,
          sm.modified_at AS reportDate,
          sm.modified_by,
          sm.modification_count,
          sm.modification_summary
        FROM ${t('sellmoney')} sm
        WHERE COALESCE(sm.is_modified, 'N') = 'Y'
          AND COALESCE(sm.modification_confirmed, 'N') <> 'Y'
      `);

      if (filters.startDate && filters.endDate) {
        sqlParts.push('AND DATE(sm.modified_at) BETWEEN ? AND ?');
        values.push(filters.startDate as string, filters.endDate as string);
      }

      sqlParts.push(`
        ORDER BY sm.modified_at DESC, sm.InvoNum DESC
      `);
    }
    else if (['inventory','TIAR'].includes(reportType)) {
      const needValue = reportType === 'TIAR';
      sqlParts.push(`
        SELECT
          e.id,
          e.RoomName,
          e.RoomCounts,
          e.DelevCount,
          e.created_at,
          ${needValue ? 'e.RoomCost,' : ''}
          COALESCE((
            SELECT SUM(st.countt)
            FROM ${t('sellmoney')} sm
            JOIN ${t('selltable')} st
              ON sm.Invonum = st.Invonum
            WHERE sm.por <> 'ملغى'
              AND sm.warehouseS = 'لم تجهز'
              AND st.RoomNum = e.id
          ),0) AS TotalSellCount
          ${needValue ? `,
          e.RoomCost * (
            e.RoomCounts +
            COALESCE((
              SELECT SUM(st.countt)
              FROM ${t('sellmoney')} sm
              JOIN ${t('selltable')} st
                ON sm.Invonum = st.Invonum
              WHERE sm.por <> 'ملغى'
                AND sm.warehouseS = 'لم تجهز'
                AND st.RoomNum = e.id
            ),0)
          ) AS TotalV` : ''}
          ,
            e.RoomCounts +
            COALESCE((
              SELECT SUM(st.countt)
              FROM ${t('sellmoney')} sm
              JOIN ${t('selltable')} st
                ON sm.Invonum = st.Invonum
              WHERE sm.por <> 'ملغى'
                AND sm.warehouseS = 'لم تجهز'
                AND st.RoomNum = e.id
            ),0
          ) AS Total
        FROM ${t('entrytable')} e
        WHERE e.RoomCounts < ?
        ORDER BY e.id ASC
      `);
      values.push(Number(filters.lowStockThreshold ?? 10));
    }
    // ═══ PROFITABILITY ═══
    else if (reportType === 'profitability') {
      sqlParts.push(`
        SELECT
          sm.Invonum,
          sm.Clname,
          sm.provide,
          sm.sum,
          (
            SELECT SUM(st.RoomCost)
            FROM ${t('selltable')} st
            WHERE st.Invonum = sm.Invonum
          ) AS Orgin,
          (
            SELECT SUM(sb.MoneyPaid)
            FROM ${t('safeboxiqd')} sb
            WHERE sb.details = sm.Invonum
              AND sb.MoneyPaid < 0
          ) AS Expenss,
          sm.sum
          - COALESCE((
              SELECT SUM(st.RoomCost)
              FROM ${t('selltable')} st
              WHERE st.Invonum = sm.Invonum
            ),0)
          + COALESCE((
              SELECT SUM(sb.MoneyPaid)
              FROM ${t('safeboxiqd')} sb
              WHERE sb.details = sm.Invonum
                AND sb.MoneyPaid < 0
            ),0) AS Profit
        FROM ${t('sellmoney')} sm
        WHERE sm.Por <> 'ملغى'
          AND sm.provide BETWEEN ? AND ?
        ORDER BY Profit DESC
      `);
      values.push(filters.startDate as string, filters.endDate as string);
    }
    // ═══ EXPENSES ═══
    else if (reportType === 'expenses') {
      sqlParts.push(`
        SELECT
          ABS(SUM(MoneyPaid)) AS MoneyPaid,
          type
        FROM ${t('safeboxiqd')}
        WHERE MoneyPaid < 0
          AND created_at BETWEEN ? AND ?
          AND type NOT IN (
            'Invoice Delete','Dept',
            'Financials','Provider Payment',
            'Rent Record','Unloading Container',
            'Invoices Payment','Affiliate Payment'
          )
        GROUP BY type
        ORDER BY type ASC
      `);
      values.push(filters.startDate as string, filters.endDate as string);
    }
    // ═══ COMPARATIVE ═══
    else if (reportType === 'comparative') {
      sqlParts.push(`
        SELECT
          COALESCE(SUM(sm.sum),0) AS totalSales,
          COALESCE((
            SELECT SUM(st.RoomCost)
            FROM ${t('selltable')} st
            WHERE st.Invonum = sm.Invonum
          ),0) AS totalCost,
          (
            SELECT ABS(SUM(sb.MoneyPaid))
            FROM ${t('safeboxiqd')} sb
            WHERE sb.MoneyPaid < 0
              AND sb.created_at BETWEEN ? AND ?
              AND sb.type NOT IN (
                'Invoice Delete','Dept',
                'Financials','Provider Payment',
                'Rent Record','Unloading Container',
                'Invoices Payment','Affiliate Payment'
              )
          ) AS totalExpenses,
          (
            SELECT ABS(SUM(sb.MoneyPaid))
            FROM ${t('safeboxiqd')} sb
            WHERE sb.type = 'Rent Record'
              AND sb.created_at BETWEEN ? AND ?
          ) AS totalExpensesRent,
          (
            SELECT SUM(pde.Money)
            FROM ${t('paymentsde')} pde
            WHERE pde.dateIssued BETWEEN ? AND ?
          ) AS totalCostReturn,
          COALESCE(SUM(
            sm.sum
            - COALESCE((
                SELECT SUM(st.RoomCost)
                FROM ${t('selltable')} st
                WHERE st.Invonum = sm.Invonum
              ),0)
            + COALESCE((
                SELECT SUM(sb.MoneyPaid)
                FROM ${t('safeboxiqd')} sb
                WHERE sb.details = sm.Invonum AND sb.MoneyPaid < 0
              ),0)
          ),0) AS totalProfit
        FROM ${t('sellmoney')} sm
        WHERE sm.Por <> 'ملغى'
          AND sm.provide BETWEEN ? AND ?
      `);
      // نضع نفس المدخل أربع مرات
      for (let i = 0; i < 4; i++) {
        values.push(filters.startDate as string, filters.endDate as string);
      }
    }
    // ═══ UNKNOWN TYPE ═══
    else {
      return NextResponse.json(
        { error: `Unknown report type '${reportType}'` },
        { status: 400 }
      );
    }

    // تنفيذ الاستعلام
    const [rows] = await db.execute(sqlParts.join("\n"), values);
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    const authResponse = toAuthorizationResponse(err);
    if (authResponse) {
      return authResponse;
    }

    console.error("Report error:", err);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  } finally {
    db.release();
  }
}
