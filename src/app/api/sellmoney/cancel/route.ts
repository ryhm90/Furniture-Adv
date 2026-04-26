import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2/promise";

import {
  ensureEntrytableExternalPurchaseColumns,
  ensureSelltableExternalPurchaseColumns,
  isExternalPurchaseEnabled,
  normalizeFinancialAccountName,
} from "@/lib/externalPurchase";
import pool from "@/lib/mysql";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

interface CancelInvoiceRequest {
  invonum: string;
  status: string;
  sellor?: string;
}

interface InvoiceRow extends RowDataPacket {
  ClName: string;
  MoneyPaid: number;
  Sum: number;
  wholesale: string | null;
  Por: string;
  affiliateID?: number | null;
  warehouseS: string | null;
}

interface ExternalPurchaseSaleRow extends RowDataPacket {
  RoomCost: number;
  RoomName: string;
  ExternalPurchase: string | null;
  FinancialAccount: string | null;
}

const CANCELED_STATUS = "ملغى";
const DELIVERED_STATUS = "جهزت";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor", "SECRETARY"]);
    const dbName = getDbNameFromSession(session);
    const { invonum, status, sellor }: CancelInvoiceRequest = await req.json();

    if (!invonum || !status) {
      return NextResponse.json(
        { message: "Invoice number and status are required" },
        { status: 400 },
      );
    }

    const currentDate = new Date().toLocaleDateString("en-CA");
    const db = await pool.getConnection();

    try {
      await ensureEntrytableExternalPurchaseColumns(db, dbName);
      await ensureSelltableExternalPurchaseColumns(db, dbName);
      await db.beginTransaction();

      let invoiceRows: InvoiceRow[] = [];

      const [affiliateRows] = await db.query<InvoiceRow[]>(
        `
          SELECT sm.ClName, sm.MoneyPaid, sm.Sum, sm.wholesale, sm.Por, apu.affiliateID, sm.warehouseS
          FROM \`${dbName}\`.sellmoney sm
          INNER JOIN \`${dbName}\`.affiliatepu apu ON apu.Invonum = sm.InvoNum
          WHERE sm.InvoNum = ?
          FOR UPDATE
        `,
        [invonum],
      );

      invoiceRows = affiliateRows;

      if (!invoiceRows[0]) {
        const [sellMoneyRows] = await db.query<InvoiceRow[]>(
          `
            SELECT sm.ClName, sm.MoneyPaid, sm.Sum, sm.wholesale, sm.Por, sm.warehouseS
            FROM \`${dbName}\`.sellmoney sm
            WHERE sm.InvoNum = ?
            FOR UPDATE
          `,
          [invonum],
        );

        invoiceRows = sellMoneyRows;
      }

      const invoice = invoiceRows[0];
      if (!invoice) {
        await db.rollback();
        return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
      }

      if (invoice.Por === CANCELED_STATUS) {
        await db.rollback();
        return NextResponse.json({ message: "Invoice is already canceled" }, { status: 400 });
      }

      if (invoice.wholesale === "Y" && invoice.affiliateID) {
        await db.query(
          `
            INSERT INTO \`${dbName}\`.affiliatepu (affiliate, MPU, Invonum, date, affiliateID, De)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [invoice.ClName, invoice.Sum, invonum, currentDate, invoice.affiliateID, "Canceled"],
        );
      }

      await db.query(
        `
          INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, date, name)
          VALUES (?, -?, ?, ?, ?)
        `,
        [invonum, invoice.MoneyPaid, "Invoice Delete", currentDate, invoice.ClName],
      );

      await db.query(
        `UPDATE \`${dbName}\`.sellmoney SET Por = ?, MoneyPaid = 0 WHERE InvoNum = ?`,
        [status, invonum],
      );

      if (invoice.warehouseS !== DELIVERED_STATUS && sellor) {
        await db.query(
          `UPDATE \`${dbName}\`.employees SET received = received - ? WHERE name = ?`,
          [invoice.MoneyPaid, sellor],
        );
      }

      const [saleRows] = await db.query<ExternalPurchaseSaleRow[]>(
        `
          SELECT st.RoomCost, et.RoomName, st.ExternalPurchase, st.FinancialAccount
          FROM \`${dbName}\`.selltable st
          INNER JOIN \`${dbName}\`.entrytable et ON et.id = st.RoomNum
          WHERE st.InvoNum = ?
        `,
        [invonum],
      );

      for (const saleRow of saleRows) {
        const linkedFinancialAccount = normalizeFinancialAccountName(saleRow.FinancialAccount);

        if (!isExternalPurchaseEnabled(saleRow.ExternalPurchase) || !linkedFinancialAccount) {
          continue;
        }

        const costAmount = Number(saleRow.RoomCost);
        if (!Number.isFinite(costAmount) || costAmount <= 0) {
          continue;
        }

        await db.query(
          `
            INSERT INTO \`${dbName}\`.dept (
              Name,
              Amount,
              state,
              details
            )
            VALUES (?, -?, ?, ?)
          `,
          [
            linkedFinancialAccount,
            costAmount,
            "Out",
            `عكس تكلفة بيع المادة ${saleRow.RoomName} من الوصل ${invonum}`,
          ],
        );
      }

      await db.commit();

      return NextResponse.json(
        { message: "Invoice status updated successfully" },
        { status: 200 },
      );
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  } catch (error) {
    const authResponse = toAuthorizationResponse(error);
    if (authResponse) {
      return authResponse;
    }

    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
