import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Opt in: REPORT_MYSQL_TEST=1 node --test tests/comparative-report.test.mjs
// All fixture writes target connection-local TEMPORARY tables, never application tables.
test("comparative totals under ONLY_FULL_GROUP_BY", { skip: process.env.REPORT_MYSQL_TEST !== "1" }, async () => {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE, connectTimeout: 5000,
  });
  try {
    await db.query("SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
    await db.query("CREATE TEMPORARY TABLE codex_report_sellmoney (Invonum VARCHAR(30), Clname VARCHAR(60), `sum` DECIMAL(18,2), Por VARCHAR(30), provide DATETIME)");
    await db.query("CREATE TEMPORARY TABLE codex_report_selltable (Invonum VARCHAR(30), RoomCost DECIMAL(18,2))");
    await db.query("CREATE TEMPORARY TABLE codex_report_safeboxiqd (details VARCHAR(30), MoneyPaid DECIMAL(18,2), type VARCHAR(40), created_at DATETIME)");
    await db.query("CREATE TEMPORARY TABLE codex_report_paymentsde (Money DECIMAL(18,2), dateIssued DATETIME)");
    await db.query("INSERT INTO codex_report_sellmoney VALUES ?", [[
      ["A", "A", 1000, "مجهز", "2026-09-10"], ["B", "B", 2000, "مجهز", "2026-09-11"],
      ["C", "C", 500, "مجهز", "2026-09-12"], ["CANCELLED", "X", 9000, "ملغى", "2026-09-10"],
      ["OUTSIDE", "X", 8000, "مجهز", "2026-08-10"],
    ]]);
    await db.query("INSERT INTO codex_report_selltable VALUES ?", [[["A", 100], ["A", 200], ["B", 600], ["CANCELLED", 7000], ["OUTSIDE", 7000]]]);
    await db.query("INSERT INTO codex_report_safeboxiqd VALUES ?", [[
      ["A", -50, "Driver", "2026-09-10"], ["B", -70, "Driver", "2026-09-11"],
      ["rent", -40, "Rent Record", "2026-09-10"],
    ]]);
    await db.query("INSERT INTO codex_report_paymentsde VALUES (25, '2026-09-10')");
    // MySQL cannot reference the same TEMPORARY table twice in one query.
    // Identical fixture copies let the unchanged subqueries run independently.
    for (const table of ["selltable", "safeboxiqd"]) {
      for (const copy of [2, 3]) {
        await db.query(`CREATE TEMPORARY TABLE codex_report_${table}_${copy} AS SELECT * FROM codex_report_${table}`);
      }
    }

    let releases = 0;
    const mocks = {
      "next/server": { NextResponse: { json: (data, init) => ({ data, status: init?.status || 200 }) } },
      "@/lib/mysql": { __esModule: true, default: { getConnection: async () => ({
        execute: (sql, values) => {
          const references = {};
          const fixtureSql = sql.replace(/`__report_test__`\.`(\w+)`/g, (_match, table) => {
            references[table] = (references[table] || 0) + 1;
            return `\`codex_report_${table}${references[table] > 1 ? `_${references[table]}` : ""}\``;
          });
          return db.execute(fixtureSql, values);
        },
        release: () => { releases += 1; },
      }) } },
      "@/lib/sellmoneyModification": { ensureSellMoneyModificationSchemaReady: () => { throw new Error("Unexpected schema mutation"); } },
      "@/lib/serverAuth": { requireRole: async () => ({ user: { role: "Manager" } }), getDbNameFromSession: () => "__report_test__", toAuthorizationResponse: () => null },
    };
    const source = fs.readFileSync(new URL("../src/app/api/reports/[reportType]/route.ts", import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: (id) => { assert.ok(mocks[id], id); return mocks[id]; }, console });
    const report = (reportType) => exports.POST({ json: async () => ({ filters: { startDate: "2026-09-01", endDate: "2026-09-30" } }) }, { params: Promise.resolve({ reportType }) });

    const result = await report("comparative");
    assert.equal(result.status, 200);
    assert.equal(result.data.length, 1);
    const totals = Object.fromEntries(Object.entries(result.data[0]).map(([key, value]) => [key, Number(value)]));
    assert.deepEqual(totals, { totalSales: 3500, totalCost: 900, totalExpenses: 120, totalExpensesRent: 40, totalCostReturn: 25, totalProfit: 2480 });
    const profitability = await report("profitability");
    assert.equal(profitability.status, 200);
    assert.equal(profitability.data.reduce((sum, row) => sum + Number(row.Orgin), 0), totals.totalCost);
    assert.equal(profitability.data.reduce((sum, row) => sum + Number(row.Profit), 0), totals.totalProfit);

    await db.query("DELETE FROM codex_report_sellmoney");
    const empty = await report("comparative");
    assert.equal(empty.status, 200);
    assert.equal(empty.data.length, 1);
    for (const key of ["totalSales", "totalCost", "totalProfit"]) assert.equal(Number(empty.data[0][key]), 0);
    assert.equal(releases, 3);
  } finally {
    await db.end();
  }
});
