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
  ensureSellMoneyModificationSchemaReady,
  insertSellMoneyModificationHistory,
} from "@/lib/sellmoneyModification";
import {
  getDbNameFromSession,
  requireRole,
  toAuthorizationResponse,
} from "@/lib/serverAuth";

const BONUS_ELIGIBLE_FLAGS = ["غرفة", "تخم"];
const CANCELED_STATUS = "ملغى";

class RequestValidationError extends Error {}

interface RequestedItemInput {
  roomnum?: number | string;
  RoomNum?: number | string;
  countt?: number | string;
}

interface SellMoneyUpdateRequest {
  ID: string;
  ClName?: string;
  Provin?: string;
  Provin2?: string;
  Cellphone?: string;
  Cellphone1?: string;
  Details?: string;
  Floor?: string;
  FloorCost?: number | string;
  selectedDate?: string;
  Sum?: number | string;
  note?: string;
  items?: RequestedItemInput[];
}

interface InvoiceRow extends RowDataPacket {
  InvoNum: string;
  ClName: string;
  CellPhone: string;
  CellPhone1: string | null;
  Provin: string;
  Provin2: string;
  Details: string | null;
  Floor: string;
  FloorCost: number;
  Provide: string | Date | null;
  Sum: number;
  MoneyPaid: number;
  MoneyRemain: number;
  sellor: string | null;
  Por: string;
  wholesale: string | null;
  modification_count: number | null;
}

interface SaleItemRow extends RowDataPacket {
  RoomNum: number;
  countt: number;
  RoomCost: number;
  ExternalPurchase: string | null;
  FinancialAccount: string | null;
  RoomName: string;
  flagf: string;
}

interface InventoryRow extends RowDataPacket {
  id: number;
  RoomName: string;
  RoomCounts: number;
  RoomCost: number;
  flagf: string;
  ExternalPurchase: string | null;
  FinancialAccount: string | null;
}

interface RequestedItem {
  roomnum: number;
  countt: number;
}

interface AggregatedSaleItem {
  roomnum: number;
  roomName: string;
  countt: number;
  totalRoomCost: number;
  unitRoomCost: number;
  flagf: string;
  externalPurchaseFlag: "Y" | "N";
  financialAccount: string | null;
}

interface PreparedInvoiceValues {
  ClName: string;
  CellPhone: string;
  CellPhone1: string;
  Provin: string;
  Provin2: string;
  Details: string;
  Floor: string;
  FloorCost: number;
  Provide: string;
  Sum: number;
}

interface PlannedInsertRow {
  roomnum: number;
  roomName: string;
  countt: number;
  lineRoomCost: number;
  externalPurchaseFlag: "Y" | "N";
  financialAccount: string | null;
}

interface FieldChange {
  label: string;
  before: string;
  after: string;
}

interface ItemChange {
  roomnum: number;
  roomName: string;
  before?: number;
  after?: number;
}

function parseNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/,/g, "").trim();
    if (!normalizedValue) {
      return Number.NaN;
    }

    return Number.parseFloat(normalizedValue);
  }

  return Number.NaN;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA");
}

function formatMoneyValue(value: number) {
  return new Intl.NumberFormat("ar-IQ").format(value);
}

function valuesAreEqual(before: string, after: string) {
  return before.trim() === after.trim();
}

function normalizeRequestedItems(items: RequestedItemInput[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new RequestValidationError("يجب إضافة مادة واحدة على الأقل داخل الوصل.");
  }

  const itemMap = new Map<number, RequestedItem>();

  for (const item of items) {
    const roomnum = Number(item?.roomnum ?? item?.RoomNum);
    const countt = parseNumberValue(item?.countt);

    if (!Number.isInteger(roomnum) || roomnum <= 0) {
      throw new RequestValidationError("توجد مادة غير صالحة داخل الوصل.");
    }

    if (!Number.isInteger(countt) || countt <= 0) {
      throw new RequestValidationError("عدد المواد يجب أن يكون رقماً صحيحاً أكبر من صفر.");
    }

    const existingValue = itemMap.get(roomnum);
    if (existingValue) {
      existingValue.countt += countt;
    } else {
      itemMap.set(roomnum, { roomnum, countt });
    }
  }

  return Array.from(itemMap.values());
}

function aggregateSaleRows(rows: SaleItemRow[]) {
  const itemsMap = new Map<number, AggregatedSaleItem>();

  for (const row of rows) {
    const roomnum = Number(row.RoomNum);
    const quantity = Number(row.countt);
    const totalRoomCost = Number(row.RoomCost);
    const existingValue = itemsMap.get(roomnum);

    if (existingValue) {
      existingValue.countt += quantity;
      existingValue.totalRoomCost += totalRoomCost;
      if (!existingValue.financialAccount) {
        existingValue.financialAccount = normalizeFinancialAccountName(row.FinancialAccount);
      }
      if (isExternalPurchaseEnabled(row.ExternalPurchase)) {
        existingValue.externalPurchaseFlag = "Y";
      }
      continue;
    }

    itemsMap.set(roomnum, {
      roomnum,
      roomName: row.RoomName,
      countt: quantity,
      totalRoomCost,
      unitRoomCost: 0,
      flagf: row.flagf,
      externalPurchaseFlag: isExternalPurchaseEnabled(row.ExternalPurchase) ? "Y" : "N",
      financialAccount: normalizeFinancialAccountName(row.FinancialAccount),
    });
  }

  itemsMap.forEach((item) => {
    item.unitRoomCost =
      item.countt > 0 ? Number((item.totalRoomCost / item.countt).toFixed(2)) : 0;
  });

  return itemsMap;
}

function aggregatePlannedRows(rows: PlannedInsertRow[]) {
  const itemsMap = new Map<number, AggregatedSaleItem>();

  for (const row of rows) {
    const existingValue = itemsMap.get(row.roomnum);

    if (existingValue) {
      existingValue.countt += row.countt;
      existingValue.totalRoomCost += row.lineRoomCost;
      if (!existingValue.financialAccount) {
        existingValue.financialAccount = row.financialAccount;
      }
      if (row.externalPurchaseFlag === "Y") {
        existingValue.externalPurchaseFlag = "Y";
      }
      continue;
    }

    itemsMap.set(row.roomnum, {
      roomnum: row.roomnum,
      roomName: row.roomName,
      countt: row.countt,
      totalRoomCost: row.lineRoomCost,
      unitRoomCost: 0,
      flagf: "",
      externalPurchaseFlag: row.externalPurchaseFlag,
      financialAccount: row.financialAccount,
    });
  }

  itemsMap.forEach((item) => {
    item.unitRoomCost =
      item.countt > 0 ? Number((item.totalRoomCost / item.countt).toFixed(2)) : 0;
  });

  return itemsMap;
}

function buildExternalCostMap(items: Map<number, AggregatedSaleItem>) {
  const costMap = new Map<
    string,
    { roomName: string; account: string; totalCost: number }
  >();

  items.forEach((item) => {
    if (item.externalPurchaseFlag !== "Y" || !item.financialAccount) {
      return;
    }

    const mapKey = `${item.roomnum}::${item.financialAccount}`;
    const existingValue = costMap.get(mapKey);

    if (existingValue) {
      existingValue.totalCost += item.totalRoomCost;
      return;
    }

    costMap.set(mapKey, {
      roomName: item.roomName,
      account: item.financialAccount,
      totalCost: item.totalRoomCost,
    });
  });

  return costMap;
}

function buildFieldChanges(currentInvoice: InvoiceRow, nextInvoice: PreparedInvoiceValues) {
  const currentFloorCost = Number(currentInvoice.FloorCost ?? 0);
  const nextFloorCost = Number(nextInvoice.FloorCost ?? 0);
  const currentSum = Number(currentInvoice.Sum ?? 0);
  const nextSum = Number(nextInvoice.Sum ?? 0);

  const comparisons: Array<{
    label: string;
    before: string;
    after: string;
  }> = [
    { label: "اسم الزبون", before: currentInvoice.ClName ?? "", after: nextInvoice.ClName ?? "" },
    { label: "المحافظة", before: currentInvoice.Provin ?? "", after: nextInvoice.Provin ?? "" },
    { label: "العنوان", before: currentInvoice.Provin2 ?? "", after: nextInvoice.Provin2 ?? "" },
    { label: "رقم الهاتف", before: currentInvoice.CellPhone ?? "", after: nextInvoice.CellPhone ?? "" },
    {
      label: "رقم الهاتف الاحتياطي",
      before: currentInvoice.CellPhone1 ?? "",
      after: nextInvoice.CellPhone1 ?? "",
    },
    { label: "الملاحظات", before: currentInvoice.Details ?? "", after: nextInvoice.Details ?? "" },
    { label: "الطابق", before: currentInvoice.Floor ?? "", after: nextInvoice.Floor ?? "" },
    {
      label: "تكلفة التفريغ",
      before: formatMoneyValue(currentFloorCost),
      after: formatMoneyValue(nextFloorCost),
    },
    {
      label: "تاريخ التجهيز",
      before: formatDateValue(currentInvoice.Provide),
      after: formatDateValue(nextInvoice.Provide),
    },
    {
      label: "المبلغ الكلي",
      before: formatMoneyValue(currentSum),
      after: formatMoneyValue(nextSum),
    },
  ];

  return comparisons
    .filter((comparison) => !valuesAreEqual(comparison.before, comparison.after))
    .map((comparison) => ({
      label: comparison.label,
      before: comparison.before || "فارغ",
      after: comparison.after || "فارغ",
    }));
}

function buildItemChanges(
  currentItems: Map<number, AggregatedSaleItem>,
  nextItems: Map<number, AggregatedSaleItem>,
) {
  const added: ItemChange[] = [];
  const removed: ItemChange[] = [];
  const updated: ItemChange[] = [];
  const keys = new Set([...currentItems.keys(), ...nextItems.keys()]);

  keys.forEach((roomnum) => {
    const currentValue = currentItems.get(roomnum);
    const nextValue = nextItems.get(roomnum);

    if (!currentValue && nextValue) {
      added.push({
        roomnum,
        roomName: nextValue.roomName,
        after: nextValue.countt,
      });
      return;
    }

    if (currentValue && !nextValue) {
      removed.push({
        roomnum,
        roomName: currentValue.roomName,
        before: currentValue.countt,
      });
      return;
    }

    if (currentValue && nextValue && currentValue.countt !== nextValue.countt) {
      updated.push({
        roomnum,
        roomName: nextValue.roomName,
        before: currentValue.countt,
        after: nextValue.countt,
      });
    }
  });

  return { added, removed, updated };
}

function buildModificationSummary(
  fieldChanges: FieldChange[],
  itemChanges: ReturnType<typeof buildItemChanges>,
  note: string,
) {
  const summaryParts: string[] = [];

  if (fieldChanges.length > 0) {
    summaryParts.push(
      `تعديل بيانات الوصل: ${fieldChanges
        .map((change) => `${change.label} من "${change.before}" إلى "${change.after}"`)
        .join("، ")}`,
    );
  }

  if (itemChanges.added.length > 0) {
    summaryParts.push(
      `مواد مضافة: ${itemChanges.added
        .map((item) => `${item.roomName} بعدد ${item.after}`)
        .join("، ")}`,
    );
  }

  if (itemChanges.removed.length > 0) {
    summaryParts.push(
      `مواد محذوفة: ${itemChanges.removed
        .map((item) => `${item.roomName} بعدد ${item.before}`)
        .join("، ")}`,
    );
  }

  if (itemChanges.updated.length > 0) {
    summaryParts.push(
      `مواد تم تعديل عددها: ${itemChanges.updated
        .map((item) => `${item.roomName} من ${item.before} إلى ${item.after}`)
        .join("، ")}`,
    );
  }

  if (note) {
    summaryParts.push(`ملاحظة التعديل: ${note}`);
  }

  return summaryParts.join(" | ");
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["Manager", "Sellor"]);
    const dbName = getDbNameFromSession(session);
    const requestBody: SellMoneyUpdateRequest = await req.json();
    const invoiceNumber = normalizeText(requestBody.ID);

    if (!invoiceNumber) {
      return NextResponse.json({ message: "رقم الوصل مطلوب." }, { status: 400 });
    }

    const requestedItems = normalizeRequestedItems(requestBody.items);
    const invoiceTotal = parseNumberValue(requestBody.Sum);
    const floorCost = parseNumberValue(requestBody.FloorCost ?? 0);

    if (!Number.isFinite(invoiceTotal) || invoiceTotal < 0) {
      return NextResponse.json({ message: "المبلغ الكلي غير صالح." }, { status: 400 });
    }

    if (!Number.isFinite(floorCost) || floorCost < 0) {
      return NextResponse.json({ message: "تكلفة التفريغ غير صالحة." }, { status: 400 });
    }

    const actorName = session.user.name?.trim() || session.user.email || "System";
    const db = await pool.getConnection();

    try {
      await ensureSellMoneyModificationSchemaReady(db, dbName);
      await ensureEntrytableExternalPurchaseColumns(db, dbName);
      await ensureSelltableExternalPurchaseColumns(db, dbName);
      await db.beginTransaction();

      const [invoiceRows] = await db.query<InvoiceRow[]>(
        `
          SELECT
            InvoNum,
            ClName,
            CellPhone,
            CellPhone1,
            Provin,
            Provin2,
            details AS Details,
            Floor,
            FloorCost,
            Provide,
            Sum,
            MoneyPaid,
            MoneyRemain,
            sellor,
            Por,
            wholesale,
            modification_count
          FROM \`${dbName}\`.sellmoney
          WHERE InvoNum = ?
          LIMIT 1
          FOR UPDATE
        `,
        [invoiceNumber],
      );

      const currentInvoice = invoiceRows[0];
      if (!currentInvoice) {
        await db.rollback();
        return NextResponse.json({ message: "لم يتم العثور على الوصل." }, { status: 404 });
      }

      if (currentInvoice.Por === CANCELED_STATUS) {
        await db.rollback();
        return NextResponse.json(
          { message: "لا يمكن تعديل وصل بيع ملغي." },
          { status: 400 },
        );
      }

      if ((currentInvoice.wholesale ?? "N") === "Y") {
        await db.rollback();
        return NextResponse.json(
          { message: "تعديل وصولات الجملة غير متاح من شاشة المبيعات." },
          { status: 400 },
        );
      }

      const currentMoneyPaid = Number(currentInvoice.MoneyPaid ?? 0);
      if (invoiceTotal < currentMoneyPaid) {
        await db.rollback();
        return NextResponse.json(
          { message: "المبلغ الكلي لا يمكن أن يكون أقل من المبلغ المدفوع." },
          { status: 400 },
        );
      }

      const [currentSaleRows] = await db.query<SaleItemRow[]>(
        `
          SELECT
            st.RoomNum,
            st.countt,
            st.RoomCost,
            st.ExternalPurchase,
            st.FinancialAccount,
            et.RoomName,
            et.flagf
          FROM \`${dbName}\`.selltable st
          INNER JOIN \`${dbName}\`.entrytable et ON et.id = st.RoomNum
          WHERE st.InvoNum = ?
          FOR UPDATE
        `,
        [invoiceNumber],
      );

      const currentItems = aggregateSaleRows(currentSaleRows);
      const plannedRows: PlannedInsertRow[] = [];
      const inventoryMap = new Map<number, InventoryRow>();

      for (const requestedItem of requestedItems) {
        const [inventoryRows] = await db.query<InventoryRow[]>(
          `
            SELECT
              id,
              RoomName,
              RoomCounts,
              RoomCost,
              flagf,
              ExternalPurchase,
              FinancialAccount
            FROM \`${dbName}\`.entrytable
            WHERE id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [requestedItem.roomnum],
        );

        const inventoryItem = inventoryRows[0];
        if (!inventoryItem) {
          await db.rollback();
          return NextResponse.json(
            { message: `المادة رقم ${requestedItem.roomnum} غير موجودة في المخزن.` },
            { status: 404 },
          );
        }

        inventoryMap.set(requestedItem.roomnum, inventoryItem);

        const previousItem = currentItems.get(requestedItem.roomnum);
        const availableAfterReverting =
          Number(inventoryItem.RoomCounts ?? 0) + Number(previousItem?.countt ?? 0);

        if (requestedItem.countt > availableAfterReverting) {
          await db.rollback();
          return NextResponse.json(
            {
              message: `الكمية المطلوبة من المادة "${inventoryItem.RoomName}" أكبر من المتاح بعد احتساب الوصل الحالي.`,
            },
            { status: 400 },
          );
        }

        const retainedQuantity = previousItem
          ? Math.min(previousItem.countt, requestedItem.countt)
          : 0;
        const additionalQuantity = requestedItem.countt - retainedQuantity;

        if (retainedQuantity > 0 && previousItem) {
          plannedRows.push({
            roomnum: requestedItem.roomnum,
            roomName: previousItem.roomName,
            countt: retainedQuantity,
            lineRoomCost: Number((previousItem.unitRoomCost * retainedQuantity).toFixed(2)),
            externalPurchaseFlag: previousItem.externalPurchaseFlag,
            financialAccount: previousItem.financialAccount,
          });
        }

        if (additionalQuantity > 0) {
          plannedRows.push({
            roomnum: requestedItem.roomnum,
            roomName: inventoryItem.RoomName,
            countt: additionalQuantity,
            lineRoomCost: Number(
              (Number(inventoryItem.RoomCost ?? 0) * additionalQuantity).toFixed(2),
            ),
            externalPurchaseFlag: isExternalPurchaseEnabled(inventoryItem.ExternalPurchase)
              ? "Y"
              : "N",
            financialAccount: normalizeFinancialAccountName(inventoryItem.FinancialAccount),
          });
        }
      }

      const nextItems = aggregatePlannedRows(plannedRows);
      const nextInvoice = {
        ClName: normalizeText(requestBody.ClName || currentInvoice.ClName),
        CellPhone: normalizeText(requestBody.Cellphone ?? currentInvoice.CellPhone),
        CellPhone1: normalizeText(requestBody.Cellphone1 ?? currentInvoice.CellPhone1 ?? ""),
        Provin: normalizeText(requestBody.Provin ?? currentInvoice.Provin),
        Provin2: normalizeText(requestBody.Provin2 ?? currentInvoice.Provin2),
        Details:
          typeof requestBody.Details === "string"
            ? requestBody.Details.trim()
            : currentInvoice.Details ?? "",
        Floor: normalizeText(requestBody.Floor ?? currentInvoice.Floor),
        FloorCost: floorCost,
        Provide:
          formatDateValue(requestBody.selectedDate) || formatDateValue(currentInvoice.Provide),
        Sum: invoiceTotal,
      };

      if (
        !nextInvoice.ClName ||
        !nextInvoice.CellPhone ||
        !nextInvoice.Provin ||
        !nextInvoice.Provin2 ||
        !nextInvoice.Floor ||
        !nextInvoice.Provide
      ) {
        await db.rollback();
        return NextResponse.json(
          { message: "الحقول الأساسية للوصل مطلوبة قبل الحفظ." },
          { status: 400 },
        );
      }

      const fieldChanges = buildFieldChanges(currentInvoice, nextInvoice);
      const itemChanges = buildItemChanges(currentItems, nextItems);
      const note = normalizeText(requestBody.note);

      if (
        fieldChanges.length === 0 &&
        itemChanges.added.length === 0 &&
        itemChanges.removed.length === 0 &&
        itemChanges.updated.length === 0
      ) {
        await db.rollback();
        return NextResponse.json(
          { message: "لا توجد تغييرات فعلية ليتم حفظها." },
          { status: 400 },
        );
      }

      for (const item of currentItems.values()) {
        await db.execute(
          `UPDATE \`${dbName}\`.entrytable SET RoomCounts = RoomCounts + ? WHERE id = ?`,
          [item.countt, item.roomnum],
        );

        if (BONUS_ELIGIBLE_FLAGS.includes(item.flagf) && currentInvoice.sellor) {
          await db.execute(
            `UPDATE \`${dbName}\`.employees SET bonus = bonus - ? WHERE name = ?`,
            [5000 * item.countt, currentInvoice.sellor],
          );
        }
      }

      await db.execute(`DELETE FROM \`${dbName}\`.selltable WHERE InvoNum = ?`, [invoiceNumber]);

      for (const item of plannedRows) {
        await db.execute(
          `
            INSERT INTO \`${dbName}\`.selltable (
              RoomNum,
              InvoNum,
              State,
              countt,
              RoomCost,
              ExternalPurchase,
              FinancialAccount
            )
            VALUES (?, ?, '1', ?, ?, ?, ?)
          `,
          [
            item.roomnum,
            invoiceNumber,
            item.countt,
            item.lineRoomCost,
            item.externalPurchaseFlag,
            item.financialAccount,
          ],
        );
      }

      for (const requestedItem of requestedItems) {
        const inventoryItem = inventoryMap.get(requestedItem.roomnum);

        if (!inventoryItem) {
          continue;
        }

        await db.execute(
          `UPDATE \`${dbName}\`.entrytable SET RoomCounts = RoomCounts - ? WHERE id = ?`,
          [requestedItem.countt, requestedItem.roomnum],
        );

        if (BONUS_ELIGIBLE_FLAGS.includes(inventoryItem.flagf) && currentInvoice.sellor) {
          await db.execute(
            `UPDATE \`${dbName}\`.employees SET bonus = bonus + ? WHERE name = ?`,
            [5000 * requestedItem.countt, currentInvoice.sellor],
          );
        }
      }

      const oldExternalCosts = buildExternalCostMap(currentItems);
      const newExternalCosts = buildExternalCostMap(nextItems);
      const deltaKeys = new Set([...oldExternalCosts.keys(), ...newExternalCosts.keys()]);

      for (const deltaKey of deltaKeys) {
        const previousValue = oldExternalCosts.get(deltaKey);
        const nextValue = newExternalCosts.get(deltaKey);
        const deltaAmount =
          Number(nextValue?.totalCost ?? 0) - Number(previousValue?.totalCost ?? 0);

        if (!Number.isFinite(deltaAmount) || deltaAmount === 0) {
          continue;
        }

        const targetRoomName = nextValue?.roomName ?? previousValue?.roomName ?? "مادة";
        const targetAccount = nextValue?.account ?? previousValue?.account;

        if (!targetAccount) {
          continue;
        }

        await db.execute(
          `
            INSERT INTO \`${dbName}\`.dept (
              Name,
              Amount,
              state,
              details
            )
            VALUES (?, ?, ?, ?)
          `,
          [
            targetAccount,
            deltaAmount,
            deltaAmount > 0 ? "In" : "Out",
            deltaAmount > 0
              ? `زيادة تكلفة بيع المادة ${targetRoomName} في الوصل ${invoiceNumber} بعد التعديل`
              : `تقليل تكلفة بيع المادة ${targetRoomName} في الوصل ${invoiceNumber} بعد التعديل`,
          ],
        );
      }

      const nextMoneyRemain = invoiceTotal - currentMoneyPaid;
      const modificationSummary = buildModificationSummary(fieldChanges, itemChanges, note);
      const historyPayload = JSON.stringify({
        note: note || null,
        fieldChanges,
        itemChanges,
        before: {
          sum: currentInvoice.Sum,
          moneyRemain: currentInvoice.MoneyRemain,
          items: Array.from(currentItems.values()),
        },
        after: {
          sum: nextInvoice.Sum,
          moneyRemain: nextMoneyRemain,
          items: Array.from(nextItems.values()),
        },
      });

      await db.execute(
        `
          UPDATE \`${dbName}\`.sellmoney
          SET
            ClName = ?,
            CellPhone = ?,
            CellPhone1 = ?,
            Provin = ?,
            Provin2 = ?,
            details = ?,
            Floor = ?,
            FloorCost = ?,
            Provide = ?,
            Sum = ?,
            MoneyRemain = ?,
            is_modified = 'Y',
            modified_at = NOW(),
            modified_by = ?,
            modification_summary = ?,
            modification_confirmed = 'N',
            modification_confirmed_at = NULL,
            modification_confirmed_by = NULL,
            modification_count = COALESCE(modification_count, 0) + 1
          WHERE InvoNum = ?
        `,
        [
          nextInvoice.ClName,
          nextInvoice.CellPhone,
          nextInvoice.CellPhone1,
          nextInvoice.Provin,
          nextInvoice.Provin2,
          nextInvoice.Details,
          nextInvoice.Floor,
          nextInvoice.FloorCost,
          nextInvoice.Provide,
          nextInvoice.Sum,
          nextMoneyRemain,
          actorName,
          modificationSummary,
          invoiceNumber,
        ],
      );

      await insertSellMoneyModificationHistory(db, dbName, {
        invoNum: invoiceNumber,
        actionType: "modified",
        summary: modificationSummary,
        payload: historyPayload,
        actorName,
      });

      await db.commit();

      return NextResponse.json(
        {
          message: "تم تحديث الوصل وتسجيل التعديل بنجاح.",
          summary: modificationSummary,
        },
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

    if (error instanceof RequestValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Error updating record:", error);
    return NextResponse.json({ message: "تعذر تحديث الوصل." }, { status: 500 });
  }
}
