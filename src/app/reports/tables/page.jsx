"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import EmptyTableRow from "@/app/components/EmptyTableRow";
import AppShell from "@/app/components/AppShell";
import { repairMojibakeText } from "@/utils/pdfArabic";

const ViewForm = dynamic(() => import("@/app/components/ViewForm"), { ssr: false });

const FONT_FAMILY = "Alexandria, sans-serif";
const numberFormatter = new Intl.NumberFormat("ar-IQ");
const t = (value) => repairMojibakeText(value);
const REPORT_LABELS = {
  sales: "تقرير المبيعات",
  delivery: "تقرير التجهيز",
  wholesale: "تقرير الجملة",
  inventory: "تقرير المخزون",
  TIAR: "تقرير القيمة المخزنية",
  profitability: "تقرير الربح",
  expenses: "تقرير المصروفات",
  comparative: "تقرير الأرباح المقارن",
  modified_receipts: "تقرير الوصولات المعدلة",
};
const REPORT_DESCRIPTIONS = {
  sales: "يعرض فواتير البيع مع المبالغ المتبقية وحالة الوصل والمواد المرتبطة بها.",
  delivery: "يعرض أوامر التجهيز مع حالة المخزن وتاريخ التجهيز والبائع والمواد.",
  wholesale: "يعرض فواتير الجملة مع حالة الوصل والقيم الإجمالية للطلبات.",
  inventory: "يعرض المواد المخزنية والكميات المتاحة والمباعة والمستلمة.",
  TIAR: "يعرض قيمة المخزون الحالية اعتماداً على الكلفة والكمية المتاحة.",
  profitability: "يعرض ربح كل فاتورة بعد احتساب الكلفة والمصروفات المرتبطة بها.",
  expenses: "يعرض ملخص المصروفات خلال الفترة المحددة مصنفاً حسب النوع.",
  comparative: "يعرض ملخصاً عاماً للمبيعات والكلفة والمصروفات والربح خلال الفترة.",
  modified_receipts: "يعرض الوصولات التي تم تعديلها ولم يؤكدها المدير بعد مع ملخص واضح لما تم تغييره.",
};

const parseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const nf = (value) => {
  const parsed = parseNumber(value);
  return parsed === null ? "-" : numberFormatter.format(parsed);
};
const df = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ar-IQ");
};
const sumBy = (rows, field) =>
  rows.reduce((total, row) => {
    const parsed = parseNumber(row?.[field]);
    return parsed === null ? total : total + parsed;
  }, 0);
const toComparableValue = (value) => {
  const parsed = parseNumber(value);
  if (parsed !== null) return parsed;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) return parsedDate;
    return value.toLowerCase();
  }
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
};
const escapeCsvValue = (value) => {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};
const getInvoiceNumber = (row) => row?.InvoNum ?? row?.Invonum ?? row?.invonum ?? null;

const columnsSales = [
  { field: "Invonum", header: "رقم الوصل" },
  { field: "ClName", header: "اسم الزبون" },
  { field: "CellPhone", header: "رقم الهاتف" },
  { field: "ProvinS", header: "العنوان" },
  { field: "sum", header: "المجموع الكلي", format: nf },
  { field: "MoneyRemain", header: "المتبقي", format: nf },
  { field: "por", header: "حالة الوصل" },
  { field: "warehouseS", header: "حالة المخزن" },
  { field: "RoomNames", header: "المواد" },
  { field: "sellor", header: "البائع" },
];
const columnsDelivery = [...columnsSales, { field: "reportDate", header: "تاريخ التجهيز", format: df }];
const columnsWholesale = [...columnsSales, { field: "wholesale", header: "جملة" }, { field: "reportDate", header: "تاريخ التجهيز", format: df }];
const columnsInventory = [
  { field: "id", header: "التسلسل" },
  { field: "RoomName", header: "اسم المادة" },
  { field: "RoomCounts", header: "الكمية المتاحة" },
  { field: "DelevCount", header: "المستلم" },
  { field: "created_at", header: "التاريخ", format: df },
  { field: "TotalSellCount", header: "المباع" },
  { field: "Total", header: "الإجمالي", format: nf },
];
const columnsTIAR = [
  ...columnsInventory.slice(0, 4),
  { field: "RoomCost", header: "كلفة المادة", format: nf },
  columnsInventory[4],
  columnsInventory[5],
  columnsInventory[6],
  { field: "TotalV", header: "إجمالي قيمة المخزون", format: nf },
];
const columnsExpenses = [
  { field: "MoneyPaid", header: "المبلغ المصروف", format: nf },
  { field: "type", header: "النوع" },
];
const columnsProfit = [
  { field: "Invonum", header: "رقم الفاتورة" },
  { field: "Clname", header: "الزبون" },
  { field: "provide", header: "التاريخ", format: df },
  { field: "sum", header: "الإجمالي", format: nf },
  { field: "Orgin", header: "الكلفة", format: nf },
  { field: "Expenss", header: "المصروف", format: nf },
  { field: "Profit", header: "الربح", format: nf },
];
const columnsModifiedReceipts = [
  { field: "InvoNum", header: "رقم الوصل" },
  { field: "ClName", header: "اسم الزبون" },
  { field: "Sum", header: "المبلغ الكلي", format: nf },
  { field: "MoneyRemain", header: "المتبقي", format: nf },
  { field: "reportDate", header: "تاريخ التعديل", format: df },
  { field: "modified_by", header: "تم التعديل بواسطة" },
  { field: "modification_count", header: "عدد مرات التعديل", format: nf },
  { field: "modification_summary", header: "ملخص التعديل" },
];
const columnMap = {
  sales: columnsSales,
  delivery: columnsDelivery,
  wholesale: columnsWholesale,
  inventory: columnsInventory,
  TIAR: columnsTIAR,
  profitability: columnsProfit,
  expenses: columnsExpenses,
  modified_receipts: columnsModifiedReceipts,
};
const reportOptions = Object.entries(REPORT_LABELS).map(([value, label]) => ({ value, label }));
const comparativeSummaryFields = [
  { label: "إجمالي المبيعات", field: "totalSales" },
  { label: "إجمالي الكلفة", field: "totalCost" },
  { label: "إجمالي المصروفات", field: "totalExpenses" },
  { label: "الإيجار الشهري", field: "totalExpensesRent" },
  { label: "فرق النقل", field: "totalCostReturn" },
  { label: "إجمالي الربح", field: "totalProfit" },
];
const KPI_FIELD_MAP = {
  sales: [{ label: "إجمالي المبيعات", field: "sum" }, { label: "إجمالي المتبقي", field: "MoneyRemain" }],
  delivery: [{ label: "قيمة الطلبات", field: "sum" }, { label: "إجمالي المتبقي", field: "MoneyRemain" }],
  wholesale: [{ label: "إجمالي المبيعات", field: "sum" }, { label: "عدد فواتير الجملة", field: "wholesale" }],
  inventory: [{ label: "إجمالي الكمية", field: "RoomCounts" }, { label: "إجمالي المباع", field: "TotalSellCount" }],
  TIAR: [{ label: "إجمالي قيمة المخزون", field: "TotalV" }],
  profitability: [{ label: "إجمالي الربح", field: "Profit" }, { label: "إجمالي الكلفة", field: "Orgin" }],
  expenses: [{ label: "إجمالي المصروفات", field: "MoneyPaid" }],
  modified_receipts: [
    { label: "إجمالي قيمة الوصولات المعدلة", field: "Sum" },
    { label: "إجمالي المبالغ المتبقية", field: "MoneyRemain" },
    { label: "عدد مرات التعديل", field: "modification_count" },
  ],
};

const DEFAULT_FILTERS = { startDate: "", endDate: "", employee: "", warehouseState: "", roomQuery: "", lowStockThreshold: "" };
const DATE_FILTER_TYPES = new Set(["sales", "delivery", "wholesale", "profitability", "expenses", "comparative"]);
const EMPLOYEE_FILTER_TYPES = new Set(["sales", "delivery", "wholesale"]);
const baseTextSx = { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: "13px", direction: "rtl" };
const fieldSx = { "& .MuiInputBase-input": baseTextSx, "& .MuiInputLabel-root": baseTextSx };
const tableCellSx = { ...baseTextSx, textAlign: "center" };
const headCellSx = { ...tableCellSx, backgroundColor: "#2c2c4d", color: "#ffffff" };
const sectionCardSx = { borderRadius: 3, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)" };

export default function ReportsPage() {
  const [reportType, setReportType] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("");
  const [orderDirection, setOrderDirection] = useState("asc");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState(null);

  const cols = useMemo(
    () =>
      (columnMap[reportType] ?? []).map((col) => ({
        ...col,
        header: t(col.header),
      })),
    [reportType],
  );
  const canShowInvoiceDetails = useMemo(
    () => cols.some((col) => ["Invonum", "InvoNum", "invonum"].includes(col.field)),
    [cols],
  );
  const reportLabel = REPORT_LABELS[reportType] ?? "جداول التقارير";
  const reportDescription = REPORT_DESCRIPTIONS[reportType] ?? "اختر نوع التقرير ثم حدّد الفلاتر المطلوبة.";

  const safeReportLabel = t(reportLabel);
  const safeReportDescription = t(reportDescription);

  const comparativeSummaryRows = useMemo(() => {
    const source = data[0] ?? {};
    return comparativeSummaryFields.map((item) => ({ ...item, value: source?.[item.field] ?? 0 }));
  }, [data]);

  const filteredRows = useMemo(() => {
    if (reportType === "comparative" || !query.trim()) return data;
    const normalizedQuery = query.trim().toLowerCase();
    return data.filter((row) => cols.some((col) => String(row?.[col.field] ?? "").toLowerCase().includes(normalizedQuery)));
  }, [cols, data, query, reportType]);

  const sortedRows = useMemo(() => {
    if (reportType === "comparative" || !orderBy) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aValue = toComparableValue(a?.[orderBy]);
      const bValue = toComparableValue(b?.[orderBy]);
      if (aValue < bValue) return orderDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return orderDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, orderBy, orderDirection, reportType]);

  const pagedRows = useMemo(() => {
    if (reportType === "comparative") return sortedRows;
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [page, reportType, rowsPerPage, sortedRows]);

  const totalsByField = useMemo(() => {
    if (!sortedRows.length || reportType === "comparative") return {};
    const totals = {};
    cols.forEach((col) => {
      if (sortedRows.some((row) => parseNumber(row?.[col.field]) !== null)) {
        totals[col.field] = sumBy(sortedRows, col.field);
      }
    });
    return totals;
  }, [cols, reportType, sortedRows]);

  const kpiCards = useMemo(() => {
    if (!sortedRows.length && reportType !== "comparative") return [];
    if (reportType === "comparative") {
      return comparativeSummaryRows.map((row) => ({ label: row.label, value: nf(row.value) }));
    }
    const metrics = (KPI_FIELD_MAP[reportType] ?? []).map((metric) => ({ label: metric.label, value: nf(sumBy(sortedRows, metric.field)) }));
    return [...metrics, { label: "عدد السجلات", value: numberFormatter.format(sortedRows.length) }];
  }, [comparativeSummaryRows, reportType, sortedRows]);

  const filterSummary = useMemo(() => {
    const items = [];
    if (DATE_FILTER_TYPES.has(reportType) && (filters.startDate || filters.endDate)) {
      items.push(`الفترة: ${filters.startDate || "-"} إلى ${filters.endDate || "-"}`);
    }
    if (filters.employee) items.push(`البائع: ${filters.employee}`);
    if (filters.warehouseState) items.push(`حالة التجهيز: ${filters.warehouseState}`);
    if (filters.roomQuery) items.push(`المادة: ${filters.roomQuery}`);
    if (filters.lowStockThreshold) items.push(`حد المخزون: أقل من ${filters.lowStockThreshold}`);
    if (query.trim() && reportType !== "comparative") items.push(`بحث داخلي: ${query.trim()}`);
    return items;
  }, [filters, query, reportType]);

  const safeFilterSummary = useMemo(() => filterSummary.map((item) => t(item)), [filterSummary]);

  const summaryRowsForExport = useMemo(() => (
    reportType === "comparative"
      ? comparativeSummaryRows.map((row) => ({ label: t(row.label), value: nf(row.value) }))
      : kpiCards.map((row) => ({ label: t(row.label), value: row.value }))
  ), [comparativeSummaryRows, kpiCards, reportType]);

  const hasResults = reportType === "comparative" ? comparativeSummaryRows.length > 0 : sortedRows.length > 0;

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= sortedRows.length) setPage(0);
  }, [page, rowsPerPage, sortedRows.length]);

  const handleReportTypeChange = (value) => {
    setReportType(value);
    setData([]);
    setFilters(DEFAULT_FILTERS);
    setError("");
    setEmptyMessage("");
    setQuery("");
    setPage(0);
    setOrderBy("");
    setOrderDirection("asc");
  };

  const resetResults = () => {
    setData([]);
    setFilters(DEFAULT_FILTERS);
    setError("");
    setEmptyMessage("");
    setQuery("");
    setPage(0);
    setOrderBy("");
    setOrderDirection("asc");
  };

  const fetchData = async () => {
    setError("");
    setEmptyMessage("");
    if (!reportType) return setError("اختر نوع التقرير أولاً.");
    if (DATE_FILTER_TYPES.has(reportType) && (!filters.startDate || !filters.endDate)) {
      return setError("حدد تاريخ البداية وتاريخ النهاية أولاً.");
    }
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      return setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || payload?.error || "تعذر جلب بيانات التقرير.");

      let rows = [];
      if (Array.isArray(payload)) rows = payload;
      else if (Array.isArray(payload?.data)) rows = payload.data;
      else if (Array.isArray(payload?.rows)) rows = payload.rows;
      else if (reportType === "comparative" && payload && typeof payload === "object") rows = [payload];

      setData(rows);
      setPage(0);
      if (!rows.length) setEmptyMessage("لا توجد نتائج مطابقة للفلاتر الحالية.");
    } catch (fetchError) {
      console.error(fetchError);
      setData([]);
      setError(fetchError?.message || "حدث خطأ غير متوقع أثناء جلب التقرير.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!reportType) return;
    const csvLines = [];
    if (reportType === "comparative") {
      csvLines.push(["الملخص", "القيمة"].map(escapeCsvValue).join(","));
      comparativeSummaryRows.forEach((row) => csvLines.push([row.label, nf(row.value)].map(escapeCsvValue).join(",")));
    } else {
      csvLines.push(cols.map((col) => escapeCsvValue(col.header)).join(","));
      sortedRows.forEach((row) => {
        const cells = cols.map((col) => escapeCsvValue(col.format ? col.format(row?.[col.field]) : row?.[col.field] ?? ""));
        csvLines.push(cells.join(","));
      });
      if (Object.keys(totalsByField).length > 0) {
        const totalsRow = cols.map((col, index) => index === 0 ? "الإجمالي" : totalsByField[col.field] ?? "");
        csvLines.push(totalsRow.map(escapeCsvValue).join(","));
      }
    }
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!reportType) return;
    setExportingPdf(true);
    try {
      const { exportTablesReportPdf } = await import("@/utils/exportTablesReportPdf");
      await exportTablesReportPdf({
        reportType,
        reportLabel: safeReportLabel,
        columns: cols,
        rows: reportType === "comparative" ? [] : sortedRows,
        summaryRows: summaryRowsForExport,
        totalsByField,
        filterSummary: safeFilterSummary,
      });
    } catch (exportError) {
      console.error(exportError);
      setError("تعذر تصدير التقرير بصيغة PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleOpenInvoiceDetails = async (row) => {
    const invoiceNumber = getInvoiceNumber(row);
    if (!invoiceNumber) {
      return;
    }

    setInvoiceLoadingId(String(invoiceNumber));

    try {
      const response = await fetch(
        `/api/sellmoney/details?invonum=${encodeURIComponent(invoiceNumber)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "تعذر تحميل تفاصيل الوصل.");
      }

      setSelectedInvoice(payload);
      setViewDialogOpen(true);
    } catch (invoiceError) {
      console.error(invoiceError);
      setError(invoiceError?.message || "تعذر تحميل تفاصيل الوصل.");
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  return (
    <AppShell A="جداول التقارير">
      {viewDialogOpen && selectedInvoice ? (
        <ViewForm
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedInvoice(null);
          }}
          inv={selectedInvoice}
        />
      ) : null}

      <Box sx={{ p: 3, fontFamily: FONT_FAMILY }}>
        <Card sx={{ ...sectionCardSx, mb: 3 }}>
          <CardContent>
            <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "22px", fontWeight: 700, mb: 1 }}>
              جداول التقارير
            </Typography>
            <Typography sx={{ ...baseTextSx, color: "text.secondary" }}>
              اختر نوع التقرير، حدّد الفلاتر المطلوبة، ثم أنشئ النتائج أو صدّرها.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ ...sectionCardSx, mb: 3 }}>
          <CardContent>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel sx={baseTextSx}>نوع التقرير</InputLabel>
                  <Select label="نوع التقرير" value={reportType} onChange={(event) => handleReportTypeChange(event.target.value)} sx={baseTextSx}>
                    {reportOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value} sx={baseTextSx}>
                        {t(option.label)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ height: "100%", borderRadius: 2.5, bgcolor: "#f8fafc", borderColor: "rgba(148, 163, 184, 0.35)" }}>
                  <CardContent>
                    <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "15px", mb: 1 }}>
                      {safeReportLabel}
                    </Typography>
                    <Typography sx={{ ...baseTextSx, color: "text.secondary" }}>{safeReportDescription}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {reportType && DATE_FILTER_TYPES.has(reportType) && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField label="من تاريخ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={filters.startDate} onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))} sx={fieldSx} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField label="إلى تاريخ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={filters.endDate} onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))} sx={fieldSx} />
                  </Grid>
                </>
              )}

              {reportType && EMPLOYEE_FILTER_TYPES.has(reportType) && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="البائع" fullWidth value={filters.employee} onChange={(event) => setFilters((prev) => ({ ...prev, employee: event.target.value }))} sx={fieldSx} />
                </Grid>
              )}

              {reportType === "delivery" && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel sx={baseTextSx}>حالة التجهيز</InputLabel>
                      <Select label="حالة التجهيز" value={filters.warehouseState} onChange={(event) => setFilters((prev) => ({ ...prev, warehouseState: event.target.value }))} sx={baseTextSx}>
                        <MenuItem value="" sx={baseTextSx}>الكل</MenuItem>
                        <MenuItem value="جهزت" sx={baseTextSx}>جهزت</MenuItem>
                        <MenuItem value="لم تجهز" sx={baseTextSx}>لم تجهز</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField label="اسم المادة" fullWidth value={filters.roomQuery} onChange={(event) => setFilters((prev) => ({ ...prev, roomQuery: event.target.value }))} sx={fieldSx} />
                  </Grid>
                </>
              )}

              {reportType === "inventory" && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField label="حد المخزون" type="number" fullWidth value={filters.lowStockThreshold} onChange={(event) => setFilters((prev) => ({ ...prev, lowStockThreshold: event.target.value }))} sx={fieldSx} />
                </Grid>
              )}
            </Grid>

            {filterSummary.length > 0 && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2.5 }}>
                {filterSummary.map((item) => (
                  <Chip key={item} label={t(item)} variant="outlined" sx={{ fontFamily: FONT_FAMILY }} />
                ))}
              </Stack>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={fetchData} disabled={loading} sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, bgcolor: "#386e6e", "&:hover": { bgcolor: "#2f5d5d" } }}>
                {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
              </Button>
              <Button variant="outlined" onClick={exportPdf} disabled={loading || exportingPdf || !hasResults} sx={{ fontFamily: FONT_FAMILY, fontWeight: 700 }}>
                {exportingPdf ? "جاري التصدير..." : "تصدير PDF"}
              </Button>
              <Button variant="outlined" onClick={exportCsv} disabled={loading || !hasResults} sx={{ fontFamily: FONT_FAMILY, fontWeight: 700 }}>
                تصدير CSV
              </Button>
              <Button variant="text" disabled={loading} onClick={resetResults} sx={{ fontFamily: FONT_FAMILY, fontWeight: 700 }}>
                إعادة تعيين
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity="error" sx={{ mb: 2, fontFamily: FONT_FAMILY }}>{error}</Alert> : null}
        {!error && emptyMessage && !loading ? <Alert severity="info" sx={{ mb: 2, fontFamily: FONT_FAMILY }}>{emptyMessage}</Alert> : null}
        {loading ? <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box> : null}

        {!loading && kpiCards.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpiCards.map((kpi) => (
              <Grid item xs={12} sm={6} md={3} key={kpi.label}>
                <Card sx={sectionCardSx} variant="outlined">
                  <CardContent>
                    <Typography sx={{ ...baseTextSx, color: "text.secondary", mb: 1 }}>{t(kpi.label)}</Typography>
                    <Typography sx={{ fontFamily: FONT_FAMILY, fontSize: "24px", fontWeight: 700 }}>{kpi.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && reportType !== "comparative" && data.length > 0 && (
          <Card sx={{ ...sectionCardSx, mb: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <TextField label="بحث داخل النتائج" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} sx={{ ...fieldSx, minWidth: { xs: "100%", md: 340 } }} />
                <Typography sx={{ ...baseTextSx, color: "text.secondary" }}>إجمالي النتائج: {numberFormatter.format(sortedRows.length)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        )}

        {!loading && reportType !== "comparative" && data.length > 0 && sortedRows.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2, fontFamily: FONT_FAMILY }}>لا توجد نتائج مطابقة لبحثك الحالي.</Alert>
        ) : null}

        {!loading && hasResults && (
          reportType === "comparative" ? (
            <Card sx={sectionCardSx}>
              <CardContent>
                <Typography sx={{ fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "16px", mb: 2 }}>ملخص التقرير</Typography>
                <TableContainer component={Paper}>
                  <Table stickyHeader>
                    <TableHead><TableRow><TableCell sx={headCellSx}>المؤشر</TableCell><TableCell sx={headCellSx}>القيمة</TableCell></TableRow></TableHead>
                    <TableBody>
                      {comparativeSummaryRows.map((row) => (
                        <TableRow key={row.field}>
                          <TableCell sx={tableCellSx}>{t(row.label)}</TableCell>
                          <TableCell sx={tableCellSx}>{nf(row.value)}</TableCell>
                        </TableRow>
                      ))}
                      {comparativeSummaryRows.length === 0 ? <EmptyTableRow colSpan={2} message="لا توجد بيانات للعرض" /> : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            <Card sx={sectionCardSx}>
              <CardContent sx={{ p: 0 }}>
                <TableContainer component={Paper} sx={{ maxHeight: 560 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {cols.map((col) => (
                          <TableCell key={col.field} sx={headCellSx}>
                            <TableSortLabel
                              active={orderBy === col.field}
                              direction={orderBy === col.field ? orderDirection : "asc"}
                              onClick={() => {
                                setPage(0);
                                if (orderBy === col.field) return setOrderDirection((prev) => prev === "asc" ? "desc" : "asc");
                                setOrderBy(col.field);
                                setOrderDirection("asc");
                              }}
                              sx={{ color: "white !important", fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: "13px", "& .MuiTableSortLabel-icon": { color: "white !important" } }}
                            >
                              {t(col.header)}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        {canShowInvoiceDetails ? (
                          <TableCell sx={headCellSx}>تفاصيل الوصل</TableCell>
                        ) : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedRows.map((row, rowIndex) => {
                        const rowKey = row?.id ?? row?.Invonum ?? row?.invonum ?? `${reportType}-row-${page}-${rowIndex}`;
                        return (
                          <TableRow key={rowKey}>
                            {cols.map((col) => (
                              <TableCell key={`${rowKey}-${col.field}`} sx={tableCellSx}>
                                {(col.format ? col.format(row?.[col.field]) : row?.[col.field]) ?? "-"}
                              </TableCell>
                            ))}
                            {canShowInvoiceDetails ? (
                              <TableCell sx={tableCellSx}>
                                {getInvoiceNumber(row) ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleOpenInvoiceDetails(row)}
                                    disabled={invoiceLoadingId === String(getInvoiceNumber(row))}
                                    sx={{
                                      fontFamily: FONT_FAMILY,
                                      fontWeight: 700,
                                      fontSize: "12px",
                                      whiteSpace: "nowrap",
                                      borderRadius: 2,
                                    }}
                                  >
                                    {invoiceLoadingId === String(getInvoiceNumber(row))
                                      ? "جاري التحميل..."
                                      : "عرض التفاصيل"}
                                  </Button>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })}

                      {Object.keys(totalsByField).length > 0 && (
                        <TableRow sx={{ backgroundColor: "#f6f9f9" }}>
                          {cols.map((col, index) => (
                            <TableCell key={`total-${col.field}`} sx={{ ...tableCellSx, fontWeight: 700 }}>
                              {index === 0 ? "الإجمالي" : totalsByField[col.field] !== undefined ? nf(totalsByField[col.field]) : ""}
                            </TableCell>
                          ))}
                          {canShowInvoiceDetails ? <TableCell sx={tableCellSx} /> : null}
                        </TableRow>
                      )}

                      {pagedRows.length === 0 ? (
                        <EmptyTableRow
                          colSpan={(cols.length || 1) + (canShowInvoiceDetails ? 1 : 0)}
                          message="لا توجد بيانات للعرض"
                        />
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={sortedRows.length}
                  page={page}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="عدد الصفوف"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                  sx={{ "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiInputBase-input": { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: "13px" } }}
                />
              </CardContent>
            </Card>
          )
        )}
      </Box>
    </AppShell>
  );
}
