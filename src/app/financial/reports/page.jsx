"use client";

import { useState } from "react";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import axios from "axios";

import AppShell from "@/app/components/AppShell";
import { exportTablesReportPdf } from "@/utils/exportTablesReportPdf";

function FinancialReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formatCurrency = (amount) =>
    `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Number(amount ?? 0))} د.ع`;

  const buildSummaryRows = () => {
    const totalIncome = Number(reportData?.total_income ?? 0);
    const totalExpenses = Number(reportData?.total_expenses ?? 0);
    const netBalance = totalIncome - totalExpenses;

    return [
      ["إجمالي الإيرادات", formatCurrency(totalIncome)],
      ["إجمالي المصروفات", formatCurrency(totalExpenses)],
      ["صافي الرصيد", formatCurrency(netBalance)],
    ];
  };

  const downloadCsv = (rows) => {
    const csvContent = [
      ["المؤشر", "القيمة"],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "financial-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReport = async (format) => {
    if (!reportData) {
      return;
    }

    const rows = buildSummaryRows();

    if (format === "csv") {
      downloadCsv(rows);
      return;
    }

    setExporting(true);

    try {
      await exportTablesReportPdf({
        reportType: "financial-summary",
        reportLabel: "التقرير المالي",
        columns: [],
        rows: [],
        summaryRows: rows.map(([label, value]) => ({ label, value })),
        filterSummary: [
          `من: ${startDate}`,
          `إلى: ${endDate}`,
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setErrorMessage("تاريخ البدء وتاريخ الانتهاء مطلوبان.");
      setReportData(null);
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.get("/api/financials/reports/providers", {
        params: {
          startDate,
          endDate,
        },
      });

      setReportData(response.data);
    } catch (error) {
      console.error("Error generating report:", error);
      setReportData(null);
      setErrorMessage("تعذر إنشاء التقرير.");
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = Number(reportData?.total_income ?? 0);
  const totalExpenses = Number(reportData?.total_expenses ?? 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <AppShell A="التقارير المالية" sx={{ direction: "rtl", textAlign: "right" }}>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "24px",
                  fontWeight: 600,
                }}
              >
                التقرير المالي
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  color: "text.secondary",
                }}
              >
                اختر الفترة الزمنية ثم أنشئ ملخصاً مالياً قابلاً للتصدير بصيغة PDF أو CSV.
              </Typography>
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                label="من تاريخ"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="إلى تاريخ"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              <Button variant="contained" onClick={handleGenerateReport} disabled={loading}>
                {loading ? "جاري إنشاء التقرير..." : "إنشاء التقرير"}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => exportReport("pdf")}
                disabled={!reportData || exporting}
              >
                {exporting ? "جاري التصدير..." : "تصدير PDF"}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => exportReport("csv")}
                disabled={!reportData || exporting}
              >
                تصدير CSV
              </Button>
            </Box>

            {errorMessage ? (
              <Typography color="error" sx={{ fontFamily: "Alexandria, sans-serif" }}>
                {errorMessage}
              </Typography>
            ) : null}

            {reportData ? (
              <Box>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "18px",
                    fontWeight: 600,
                  }}
                >
                  ملخص التقرير
                </Typography>
                <Typography sx={{ mt: 1, fontFamily: "Alexandria, sans-serif" }}>
                  إجمالي الإيرادات: {formatCurrency(totalIncome)}
                </Typography>
                <Typography sx={{ mt: 0.75, fontFamily: "Alexandria, sans-serif" }}>
                  إجمالي المصروفات: {formatCurrency(totalExpenses)}
                </Typography>
                <Typography sx={{ mt: 0.75, fontFamily: "Alexandria, sans-serif" }}>
                  صافي الرصيد: {formatCurrency(netBalance)}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default FinancialReports;
