import { NextResponse } from "next/server";
import pool from "@/lib/mysql";
import { getDbNameFromSession, requireRole, toAuthorizationResponse } from "@/lib/serverAuth";
import { canPayDriver, canSettle, isBaghdad, parseAmount, validAmount, validDate } from "@/lib/deliverySettlement.mjs";

export const dynamic = "force-dynamic";
const fail = (message: string, status = 400) => NextResponse.json({ message }, { status });

export async function GET(request: Request) {
  try {
    const session = await requireRole(["Manager", "Provider"]);
    const dbName = getDbNameFromSession(session);
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (!validDate(from) || !validDate(to) || from! > to!) return fail("اختر فترة تاريخ صحيحة.");
    const status = params.get("status") || "all";
    if (!["all", "ready", "pending"].includes(status)) return fail("الفلاتر غير صالحة.");
    const conditions = ["sm.Provide >= ?", "sm.Provide < DATE_ADD(?, INTERVAL 1 DAY)", "COALESCE(sm.Por, '') <> 'ملغى'", "LOWER(COALESCE(sm.wholesale, '')) <> 'y'"];
    const values: string[] = [from!, to!];
    conditions.push("(sm.MoneyRemain > 0 OR (sm.warehouseS = 'جهزت' AND COALESCE(sm.Driverflag, '') <> 'Paid'))");
    if (status === "ready") conditions.push("sm.warehouseS = 'جهزت'");
    if (status === "pending") conditions.push("COALESCE(sm.warehouseS, '') <> 'جهزت'");
    const query = params.get("query")?.trim();
    if (query) {
      conditions.push("(sm.InvoNum LIKE ? OR sm.ClName LIKE ? OR sm.CellPhone LIKE ? OR sm.CellPhone1 LIKE ?)");
      values.push(...Array(4).fill(`%${query}%`));
    }
    const [rows] = await pool.query(`SELECT sm.*, (
      SELECT GROUP_CONCAT(DISTINCT et.RoomName ORDER BY et.RoomName SEPARATOR ', ')
      FROM \`${dbName}\`.selltable st LEFT JOIN \`${dbName}\`.entrytable et ON et.id = st.RoomNum
      WHERE st.InvoNum = sm.InvoNum
    ) AS RoomNames FROM \`${dbName}\`.sellmoney sm WHERE ${conditions.join(" AND ")} ORDER BY sm.ID DESC`, values);
    return NextResponse.json(rows);
  } catch (error) {
    const response = toAuthorizationResponse(error);
    if (response) return response;
    console.error("Unpaid delivery search failed:", error);
    return fail("تعذر تحميل الوصولات.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["Manager"]);
    const dbName = getDbNameFromSession(session);
    const body = await request.json();
    if (!body || typeof body !== "object") return fail("الطلب غير صالح.");
    const { action, invoices, baghdadAmount, otherAmount } = body;
    if (!["settle", "driver"].includes(action) || !Array.isArray(invoices) || !invoices.length) return fail("حدد الوصولات المطلوبة.");
    if (!session.user.name) return fail("اسم المستخدم غير متوفر.");
    if (invoices.some((item: any) => !item || typeof item.invoNum !== "string" || !item.invoNum.trim())) return fail("أرقام الوصولات غير صالحة.");
    const numbers = invoices.map((item: any) => item.invoNum).sort();
    if (new Set(numbers).size !== numbers.length) return fail("توجد أرقام وصولات مكررة.");
    const db = await pool.getConnection();
    try {
      await db.beginTransaction();
      const [rows]: any = await db.query(`SELECT * FROM \`${dbName}\`.sellmoney WHERE InvoNum IN (${numbers.map(() => "?").join(",")}) ORDER BY InvoNum FOR UPDATE`, numbers);
      const snapshots = new Map(invoices.map((item: any) => [item.invoNum, item]));
      if (rows.length !== numbers.length) {
        await db.rollback();
        return fail("تغيرت الوصولات، أعد البحث قبل التنفيذ.", 409);
      }
      let total = 0;
      for (const row of rows) {
        const snapshot: any = snapshots.get(String(row.InvoNum));
        const eligible = row.Por !== "ملغى" && String(row.wholesale ?? "").toLowerCase() !== "y" &&
          (action === "settle" ? canSettle(row) && Number(snapshot?.moneyRemain) === Number(row.MoneyRemain) :
            canPayDriver(row) && snapshot?.driver === row.Driver && snapshot?.province === row.Provin);
        if (!eligible) {
          await db.rollback();
          return fail(`تغيرت بيانات الوصل ${row.InvoNum} أو أنه غير مؤهل. أعد البحث؛ لم يتم تسجيل أي مبلغ.`, 409);
        }
        const amount = action === "settle" ? Number(row.MoneyRemain) : parseAmount(isBaghdad(row.Provin) ? baghdadAmount : otherAmount);
        if (!(action === "settle" ? Number.isFinite(amount) && amount > 0 : validAmount(isBaghdad(row.Provin) ? baghdadAmount : otherAmount))) {
          await db.rollback();
          return fail("أدخل مبلغاً صحيحاً أكبر من صفر لكل منطقة مطلوبة.");
        }
        if (action === "settle") {
          await db.query(`UPDATE \`${dbName}\`.sellmoney SET MoneyPaid = COALESCE(MoneyPaid, 0) + ?, MoneyRemain = 0 WHERE InvoNum = ?`, [amount, row.InvoNum]);
        } else {
          await db.query(`UPDATE \`${dbName}\`.sellmoney SET Driverflag = 'Paid', Por = 'مجهز' WHERE InvoNum = ?`, [row.InvoNum]);
        }
        await db.query(`INSERT INTO \`${dbName}\`.safeboxiqd (details, MoneyPaid, type, name, OpName) VALUES (?, ?, ?, ?, ?)`,
          [row.InvoNum, action === "settle" ? amount : -amount, action === "settle" ? "Invoices Payment" : "Driver", action === "settle" ? row.ClName : row.Driver, session.user.name]);
        total += amount;
      }
      await db.commit();
      return NextResponse.json({ count: rows.length, total });
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  } catch (error) {
    const response = toAuthorizationResponse(error);
    if (response) return response;
    if (error instanceof SyntaxError) return fail("الطلب غير صالح.");
    console.error("Delivery settlement failed:", error);
    return fail("تعذر إتمام العملية. أعد البحث للتحقق من حالة الوصولات قبل المحاولة مجدداً.", 500);
  }
}
