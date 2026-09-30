import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const base = { InvoNum: "100", MoneyRemain: 100000, MoneyPaid: 20000, warehouseS: "جهزت", Driver: "السائق", Driverflag: "", Provin: "بغداد", Por: "غير مجهز", wholesale: "", ClName: "الزبون" };
const bodyFor = (rows, action = "settle") => ({ action, baghdadAmount: 15000, otherAmount: 25000,
  invoices: rows.map((row) => ({ invoNum: row.InvoNum, moneyRemain: row.MoneyRemain, driver: row.Driver, province: row.Provin })) });

async function harness(rows = [base], options = {}) {
  const helpers = await import("../src/lib/deliverySettlement.mjs");
  const events = [];
  const db = {
    beginTransaction: async () => { events.push("begin"); await options.connection?.beginTransaction(); },
    commit: async () => { events.push("commit"); await options.connection?.commit(); },
    rollback: async () => { events.push("rollback"); await options.connection?.rollback(); }, release: () => events.push("release"),
    query: async (sql, args) => {
      events.push({ sql, args });
      if (options.failInsert && sql.startsWith("INSERT")) throw new Error("simulated failure");
      if (options.connection) return options.connection.query(sql.replace(/`testdb`\.(sellmoney|safeboxiqd)/g, "`codex_driver_test_$1`"), args);
      return [sql.startsWith("SELECT") ? rows : { affectedRows: 1 }];
    },
  };
  const mocks = {
    "next/server": { NextResponse: { json: (data, init) => ({ status: init?.status || 200, data }) } },
    "@/lib/mysql": { __esModule: true, default: { getConnection: async () => db, query: db.query } },
    "@/lib/serverAuth": {
      requireRole: async (roles) => { if (!roles.includes(options.role || "Manager")) throw Object.assign(new Error("Forbidden"), { status: 403 }); return { user: { name: "Operator" } }; },
      getDbNameFromSession: () => "testdb", toAuthorizationResponse: (error) => error.status ? { status: error.status } : null,
    },
    "@/lib/deliverySettlement.mjs": helpers,
  };
  const source = fs.readFileSync(new URL("../src/app/api/delivery/unpaid/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => { assert.ok(mocks[id], id); return mocks[id]; }, URL, console: { error() {} } });
  return { events, post: (body) => exports.POST({ json: async () => body }), get: (query) => exports.GET({ url: `http://localhost/api/delivery/unpaid?${query}` }) };
}

test("date and wage validation, province classification", async () => {
  const { validDate, validAmount, isBaghdad } = await import("../src/lib/deliverySettlement.mjs");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-09-30"), true);
  for (const value of ["", 0, -10, "NaN", Infinity, 2.5]) assert.equal(validAmount(value), false);
  assert.equal(validAmount("15000"), true);
  assert.equal(isBaghdad("بَغداد"), true);
  assert.equal(isBaghdad("بغداد الكرخ"), true);
  assert.equal(isBaghdad("بابل"), false);
});

test("search combines inclusive dates, warehouse filter, customer balance and query", async () => {
  const h = await harness();
  assert.equal((await h.get("from=2026-09-01&to=2026-09-30&status=ready&query=100")).status, 200);
  const query = h.events.find((event) => event.sql);
  assert.match(query.sql, /sm.MoneyRemain > 0/);
  assert.match(query.sql, /DATE_ADD\(\?, INTERVAL 1 DAY\)/);
  assert.match(query.sql, /sm.warehouseS = 'جهزت'/);
  assert.deepEqual(Array.from(query.args), ["2026-09-01", "2026-09-30", "%100%", "%100%", "%100%", "%100%"]);
  assert.equal((await h.get("from=2026-10-01&to=2026-09-30")).status, 400);
});

test("settlement credits safe box and clears remaining balance in one transaction", async () => {
  const h = await harness();
  const response = await h.post(bodyFor([base]));
  assert.equal(response.status, 200);
  assert.equal(response.data.total, 100000);
  const insert = h.events.find((event) => event.sql?.startsWith("INSERT"));
  assert.deepEqual(Array.from(insert.args), ["100", 100000, "Invoices Payment", "الزبون", "Operator"]);
  assert.match(h.events.find((event) => event.sql?.startsWith("SELECT")).sql, /FOR UPDATE/);
  assert.ok(h.events.includes("commit"));
  assert.equal(h.events.at(-1), "release");
});

test("driver wages apply province rate per invoice and debit the safe box", async () => {
  const rows = [base, { ...base, InvoNum: "101", Provin: "بابل" }];
  const h = await harness(rows);
  const response = await h.post(bodyFor(rows, "driver"));
  assert.equal(response.status, 200);
  assert.equal(response.data.total, 40000);
  assert.deepEqual(h.events.filter((event) => event.sql?.startsWith("INSERT")).map((event) => event.args[1]), [-15000, -25000]);
});

test("stale balances, pending, canceled and wholesale invoices cannot be settled", async () => {
  for (const change of [{ MoneyRemain: 50000 }, { MoneyRemain: 0 }, { warehouseS: "لم تجهز" }, { Por: "ملغى" }, { wholesale: "Y" }]) {
    const h = await harness([{ ...base, ...change }]);
    assert.equal((await h.post(bodyFor([base]))).status, 409);
    assert.ok(h.events.includes("rollback"));
    assert.ok(!h.events.includes("commit"));
  }
});

test("driver payout rejects repeats, missing assignments, changed province and invalid rates", async () => {
  for (const change of [{ Driverflag: "Paid" }, { Driver: "" }, { Provin: "" }, { Provin: "بابل" }, { MoneyRemain: 0 }]) {
    const h = await harness([{ ...base, ...change }]);
    assert.equal((await h.post(bodyFor([base], "driver"))).status, 409);
    assert.ok(!h.events.includes("commit"));
  }
  const h = await harness();
  assert.equal((await h.post({ ...bodyFor([base], "driver"), baghdadAmount: -1 })).status, 400);
});

test("failed cash entry rolls back the batch and releases connection", async () => {
  const h = await harness([base], { failInsert: true });
  assert.equal((await h.post(bodyFor([base]))).status, 500);
  assert.ok(h.events.includes("rollback"));
  assert.ok(!h.events.includes("commit"));
  assert.equal(h.events.at(-1), "release");
});

test("provider cannot post payments; duplicate invoices cannot post", async () => {
  const provider = await harness([base], { role: "Provider" });
  assert.equal((await provider.post(bodyFor([base]))).status, 403);
  assert.equal(provider.events.length, 0);
  const h = await harness();
  assert.equal((await h.post(bodyFor([base, base]))).status, 400);
  assert.equal(h.events.length, 0);
});

test("driver payment explains missing region rates and accepts Arabic/grouped amounts", async () => {
  const { driverPaymentError, driverExclusionReason, parseAmount } = await import("../src/lib/deliverySettlement.mjs");
  const outside = { ...base, InvoNum: "101", Provin: "بابل" };
  assert.match(driverPaymentError([base, outside], "15000", ""), /خارج بغداد/);
  assert.equal(driverPaymentError([base], "١٥٬٠٠٠", ""), "");
  assert.equal(driverPaymentError([outside], "", "۲۵,۰۰۰"), "");
  assert.equal(driverExclusionReason({ ...base, Driver: "" }), "اسم السائق غير محدد");
  for (const value of ["15,000", "١٥٬٠٠٠", "۱۵۰۰۰"]) assert.equal(parseAmount(value), 15000);
  for (const value of ["1.5", "١٫٥", "-15", "abc", true]) assert.ok(Number.isNaN(parseAmount(value)));
  const h = await harness([base, outside]);
  const response = await h.post({ ...bodyFor([base, outside], "driver"), baghdadAmount: "١٥٬٠٠٠", otherAmount: "25,000" });
  assert.equal(response.status, 200);
  assert.equal(response.data.total, 40000);
});

// Uses real column definitions with connection-local temporary tables only.
test("driver payout works with MySQL schema and cannot be paid twice", { skip: process.env.DELIVERY_MYSQL_TEST !== "1" }, async () => {
  const { default: dotenv } = await import("dotenv");
  const { default: mysql } = await import("mysql2/promise");
  dotenv.config({ path: ".env.local" });
  dotenv.config();
  const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE, connectTimeout: 5000 });
  try {
    await connection.query("CREATE TEMPORARY TABLE codex_driver_test_sellmoney LIKE sellmoney");
    await connection.query("CREATE TEMPORARY TABLE codex_driver_test_safeboxiqd LIKE safeboxiqd");
    const fixtures = [{ ...base, wholesale: null }, { ...base, wholesale: null, InvoNum: "101", Provin: "بابل" }];
    for (const row of fixtures) await connection.query("INSERT INTO codex_driver_test_sellmoney SET ?", row);
    const h = await harness([], { connection });
    const body = { ...bodyFor(fixtures, "driver"), baghdadAmount: "١٥٬٠٠٠", otherAmount: "25,000" };
    assert.equal((await h.post(body)).status, 200);
    const [ledger] = await connection.query("SELECT MoneyPaid, type, name FROM codex_driver_test_safeboxiqd ORDER BY details");
    assert.deepEqual(ledger.map((row) => Number(row.MoneyPaid)), [-15000, -25000]);
    assert.ok(ledger.every((row) => row.type === "Driver" && row.name === base.Driver));
    const [invoices] = await connection.query("SELECT Driverflag, MoneyRemain FROM codex_driver_test_sellmoney");
    assert.ok(invoices.every((row) => row.Driverflag === "Paid" && Number(row.MoneyRemain) === base.MoneyRemain));
    assert.equal((await h.post(body)).status, 409);
    const [[count]] = await connection.query("SELECT COUNT(*) AS count FROM codex_driver_test_safeboxiqd");
    assert.equal(count.count, 2);
  } finally {
    await connection.end();
  }
});
