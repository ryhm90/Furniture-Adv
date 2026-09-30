"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "react-toastify";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AppShell from "@/app/components/AppShell";
import DeliveryResultsTable from "../DeliveryResultsTable";
import { canPayDriver, canSettle, driverExclusionReason, driverPaymentError, isBaghdad, parseAmount, validAmount, validDate } from "@/lib/deliverySettlement.mjs";

const ViewForm = dynamic(() => import("@/app/components/ViewForm"), { ssr: false });
const currency = (amount) => `${Number(amount || 0).toLocaleString("ar-IQ")} د.ع`;
const today = () => new Date().toLocaleDateString("en-CA");
const initialFilters = () => ({ from: `${today().slice(0, 7)}-01`, to: today(), status: "all", query: "" });
const snapshot = (row) => ({ invoNum: String(row.InvoNum), moneyRemain: row.MoneyRemain, driver: row.Driver, province: row.Provin });

export default function UnpaidDeliveryPage() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(null);
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [view, setView] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [baghdadAmount, setBaghdadAmount] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const manager = session?.user?.role === "Manager";
  const dirty = !applied || JSON.stringify(filters) !== JSON.stringify(applied);
  const ready = rows.filter(canSettle);
  const driverRows = rows.filter(canPayDriver);
  const baghdadCount = driverRows.filter((row) => isBaghdad(row.Provin)).length;
  const otherCount = driverRows.length - baghdadCount;
  const validWages = (!baghdadCount || validAmount(baghdadAmount)) && (!otherCount || validAmount(otherAmount));
  const wagesTotal = baghdadCount * (parseAmount(baghdadAmount) || 0) + otherCount * (parseAmount(otherAmount) || 0);
  const wageError = driverPaymentError(rows, baghdadAmount, otherAmount);
  const exclusions = rows.reduce((summary, row) => {
    const reason = driverExclusionReason(row);
    if (reason) summary[reason] = (summary[reason] || 0) + 1;
    return summary;
  }, {});

  async function loadResults(nextFilters) {
    const response = await axios.get("/api/delivery/unpaid", { params: nextFilters });
    if (!Array.isArray(response.data)) throw new Error("بيانات الوصولات غير صالحة.");
    setRows(response.data);
    setApplied({ ...nextFilters });
    setPage(0);
  }

  async function search() {
    if (lock.current) return;
    if (!validDate(filters.from) || !validDate(filters.to) || filters.from > filters.to) {
      setError("حدد تاريخ البداية والنهاية بصورة صحيحة.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await loadResults(filters);
      const staff = await Promise.allSettled([axios.get("/api/delivery/drivers"), axios.get("/api/delivery/carpenters")]);
      if (staff[0].status === "fulfilled") setDrivers(staff[0].value.data);
      if (staff[1].status === "fulfilled") setCarpenters(staff[1].value.data);
      if (staff.some((result) => result.status === "rejected")) toast.error("تعذر تحميل بعض قوائم السائقين وفنيي التركيب.");
    } catch (err) {
      setRows([]);
      setApplied(null);
      setError(err.response?.data?.message || err.message || "تعذر تحميل الوصولات.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function updateField(value, type, invoNum) {
    if (lock.current || dirty) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await axios.put("/api/delivery/update", { InvoNum: invoNum, type, name: value || null });
      await loadResults(applied);
      toast.success("تم تحديث الوصل.");
    } catch (err) {
      setApplied(null);
      setError(err.response?.data?.message || "تعذر تحديث البيانات. أعد البحث.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function prepare(action, selectedRows) {
    if (busy || lock.current) return;
    const message = dirty ? "تغيرت الفلاتر. اضغط بحث لتحديث النتائج قبل الصرف." : action === "driver" ? wageError : "";
    if (message) {
      toast.error(message);
      return;
    }
    if (!selectedRows.length) return;
    setError("");
    setConfirmation({ action, invoices: selectedRows.map(snapshot), baghdadAmount, otherAmount,
      total: action === "settle" ? selectedRows.reduce((sum, row) => sum + Number(row.MoneyRemain), 0) : wagesTotal });
  }

  async function submit() {
    if (lock.current || !confirmation) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await axios.post("/api/delivery/unpaid", confirmation);
      toast.success(`تم ${confirmation.action === "settle" ? "تسديد" : "صرف أجور"} ${response.data.count} وصل بإجمالي ${currency(response.data.total)}.`);
      setConfirmation(null);
      await loadResults(applied);
    } catch (err) {
      setConfirmation(null);
      setApplied(null);
      setError(err.response?.data?.message || "تعذر التأكد من نتيجة العملية. أعد البحث للتحقق قبل المحاولة مجدداً.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const field = (name) => ({ value: filters[name], disabled: busy, onChange: (event) => setFilters((previous) => ({ ...previous, [name]: event.target.value })) });
  const changeAssignment = (event, type, invoNum) => updateField(event.target.value, type, invoNum);

  return <AppShell A="الوصولات غير المسددة" sx={{ direction: "rtl", textAlign: "right" }}>
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: "Alexandria, sans-serif", "& .MuiTypography-root, & .MuiButton-root, & .MuiInputBase-root, & .MuiInputLabel-root": { fontFamily: "inherit" } }}>
      <Stack spacing={3}>
        <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, #f3f7f7, #e8f2f2)" }}><CardContent>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box><Typography variant="h5">الوصولات غير المسددة</Typography><Typography sx={{ mt: 1 }}>متابعة المتبقي من مبالغ الزبائن وأجور السائق غير المصروفة للوصولات المجهزة حسب تاريخ التجهيز.</Typography></Box>
            <Button component={Link} href="/delivery">إدارة التجهيز والسائقين</Button>
          </Stack>
        </CardContent></Card>

        <Card sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField label="من تاريخ التجهيز" type="date" InputLabelProps={{ shrink: true }} {...field("from")} fullWidth />
            <TextField label="إلى تاريخ التجهيز" type="date" InputLabelProps={{ shrink: true }} {...field("to")} fullWidth />
            <TextField select label="حالة التجهيز من المخزن" {...field("status")} fullWidth>
              <MenuItem value="all">جميع الحالات</MenuItem><MenuItem value="ready">جهزت</MenuItem><MenuItem value="pending">لم تجهز / غير محددة</MenuItem>
            </TextField>
            <TextField label="رقم الوصل أو الزبون أو الهاتف" {...field("query")} fullWidth />
            <Button variant="contained" disabled={busy} onClick={search} sx={{ minWidth: 110, bgcolor: "#386e6e" }}>بحث</Button>
          </Stack>
          <Typography variant="body2">الفترة تشمل يوم البداية ويوم النهاية. تظهر وصولات المفرد غير الملغاة التي بقي عليها مبلغ من الزبون، وكذلك الوصولات المجهزة التي لم تُصرف أجور سائقها حتى لو سدد الزبون بالكامل.</Typography>
          {dirty && applied ? <Alert severity="info">تغيرت الفلاتر؛ اضغط بحث لتحديث النتائج وتفعيل الإجراءات.</Alert> : null}
        </Stack></CardContent></Card>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {busy ? <CircularProgress aria-label="جاري تحميل أو تحديث الوصولات" /> : null}
        {applied ? <>
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
            <Chip label={`الوصولات: ${rows.length}`} /><Chip label={`المجهزة: ${rows.filter((row) => row.warehouseS === "جهزت").length}`} color="success" />
            <Chip label={`المجهزة وبانتظار تسديد الزبون: ${ready.length}`} />
            <Chip label={`إجمالي المتبقي: ${currency(rows.reduce((sum, row) => sum + Number(row.MoneyRemain), 0))}`} />
          </Stack>
          {manager ? <Card sx={{ borderRadius: 3 }}><CardContent><Stack spacing={2}>
            <Typography variant="h6">إجراءات جميع نتائج البحث</Typography>
            <Alert severity="info">تشمل الإجراءات الوصولات المؤهلة في جميع صفحات الجدول. صرف الأجور متاح للمجهزة ذات السائق والمحافظة المحددين، حتى لو سدد الزبون بالكامل، مع استبعاد الأجور المصروفة سابقاً. يبقى الوصل المجهز في القائمة إلى حين تسديد الزبون وصرف أجور السائق.</Alert>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="أجرة السائق لكل وصل في بغداد (د.ع)" value={baghdadAmount} onChange={(event) => setBaghdadAmount(event.target.value)} disabled={busy || !baghdadCount} inputProps={{ inputMode: "numeric" }} error={Boolean(baghdadCount && baghdadAmount && !validAmount(baghdadAmount))} helperText={`${baghdadCount} وصل مؤهل${baghdadCount ? " — مثال: 15,000 أو ١٥٠٠٠" : " — لا يلزم إدخال مبلغ"}`} fullWidth />
              <TextField label="أجرة السائق لكل وصل خارج بغداد (د.ع)" value={otherAmount} onChange={(event) => setOtherAmount(event.target.value)} disabled={busy || !otherCount} inputProps={{ inputMode: "numeric" }} error={Boolean(otherCount && otherAmount && !validAmount(otherAmount))} helperText={`${otherCount} وصل مؤهل${otherCount ? " — التصنيف حسب المحافظة" : " — لا يلزم إدخال مبلغ"}`} fullWidth />
            </Stack>
            <Typography>إجمالي أجور السائق: {currency(validWages ? wagesTotal : 0)} — المستبعدة: {rows.length - driverRows.length} وصل</Typography>
            {Object.keys(exclusions).length ? <Alert severity="info">أسباب الاستبعاد: {Object.entries(exclusions).map(([reason, count]) => `${reason}: ${count}`).join("، ")}. يمكن تحديد السائق من عمود السائق في الجدول.</Alert> : null}
            {wageError ? <Alert severity="warning">{wageError}</Alert> : null}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button variant="contained" disabled={busy} onClick={() => prepare("driver", driverRows)}>صرف أجور السائق للوصولات الظاهرة المؤهلة ({driverRows.length})</Button>
              <Button variant="outlined" disabled={busy || dirty || !ready.length} onClick={() => prepare("settle", ready)}>تسديد جميع الوصولات المجهزة ({ready.length})</Button>
            </Stack>
          </Stack></CardContent></Card> : null}
          <DeliveryResultsTable role={session?.user?.role} data={rows} page={page} rowsPerPage={rowsPerPage} drivers={drivers} carpenters={carpenters}
            onPageChange={(_event, nextPage) => setPage(nextPage)} onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            onView={setView} onPayment={(row) => prepare("settle", [row])} onDelivery={(row) => updateField("جهزت", "warehouseS", row.InvoNum)}
            onReturn={(row) => updateField("لم تجهز", "warehouseS", row.InvoNum)} onDriverChange={changeAssignment} onCarpenterChange={changeAssignment} onTimeChange={changeAssignment}
            showProvideColumn showPaymentColumns disabled={busy || dirty} />
        </> : !busy && !error ? <Alert severity="info">حدد الفترة ثم اضغط بحث لعرض الوصولات غير المسددة.</Alert> : null}
      </Stack>
    </Box>
    {view ? <ViewForm open inv={view} onClose={() => { setView(null); setApplied(null); setRows([]); }} /> : null}
    <Dialog open={Boolean(confirmation)} onClose={() => { if (!busy) setConfirmation(null); }} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{confirmation?.action === "settle" ? "تأكيد التسديد الكامل" : "تأكيد صرف أجور السائق"}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Typography>عدد الوصولات: {confirmation?.invoices.length} — الإجمالي: {currency(confirmation?.total)}</Typography>
        <Typography sx={{ maxHeight: 160, overflow: "auto", overflowWrap: "anywhere" }}>أرقام الوصولات: {confirmation?.invoices.map((item) => item.invoNum).join("، ")}</Typography>
        <Alert severity="warning">سيتم تسجيل المبلغ في الصندوق وتحديث الوصولات. لا يشمل الإجراء الوصولات غير المجهزة.</Alert>
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setConfirmation(null)}>إلغاء</Button><Button variant="contained" disabled={busy} onClick={submit}>{busy ? "جاري التنفيذ..." : "تأكيد التنفيذ"}</Button></DialogActions>
    </Dialog>
  </AppShell>;
}
