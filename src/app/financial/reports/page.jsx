"use client";

import { useState } from "react";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import axios from "axios";

import AppShell from "@/app/components/AppShell";

function FinancialReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IQD",
    }).format(Number(amount ?? 0));

  const buildSummaryRows = () => {
    const totalIncome = Number(reportData?.total_income ?? 0);
    const totalExpenses = Number(reportData?.total_expenses ?? 0);
    const netBalance = totalIncome - totalExpenses;

    return [
      ["Total Income", formatCurrency(totalIncome)],
      ["Total Expenses", formatCurrency(totalExpenses)],
      ["Net Balance", formatCurrency(netBalance)],
    ];
  };

  const downloadCsv = (rows) => {
    const csvContent = [
      ["Metric", "Value"],
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
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();
      const autoTable = autoTableModule.default;

      doc.setFontSize(16);
      doc.text("Financial Report", 14, 16);
      doc.setFontSize(11);
      doc.text(`From: ${startDate}`, 14, 24);
      doc.text(`To: ${endDate}`, 14, 30);

      autoTable(doc, {
        startY: 38,
        head: [["Metric", "Value"]],
        body: rows,
      });

      doc.save("financial-report.pdf");
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setErrorMessage("Start date and end date are required.");
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
      setErrorMessage("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = Number(reportData?.total_income ?? 0);
  const totalExpenses = Number(reportData?.total_expenses ?? 0);
  const netBalance = totalIncome - totalExpenses;

  return (
    <AppShell A="Financial Reports">
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h6">Financial Reports</Typography>
          </Box>

          <Box display="flex" gap={4} mb={4} flexWrap="wrap">
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? "Generating Report..." : "Generate Report"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => exportReport("pdf")}
              disabled={!reportData || exporting}
            >
              {exporting ? "Exporting..." : "Export as PDF"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => exportReport("csv")}
              disabled={!reportData || exporting}
            >
              Export as CSV
            </Button>
          </Box>

          {errorMessage ? (
            <Typography color="error" mt={3}>
              {errorMessage}
            </Typography>
          ) : null}

          {reportData ? (
            <Box mt={4}>
              <Typography variant="h6">Report Summary</Typography>
              <Typography>Total Income: {formatCurrency(totalIncome)}</Typography>
              <Typography>Total Expenses: {formatCurrency(totalExpenses)}</Typography>
              <Typography>Net Balance: {formatCurrency(netBalance)}</Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default FinancialReports;
