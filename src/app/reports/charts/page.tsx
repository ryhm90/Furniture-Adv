"use client";
import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  TextField,
  Button,
} from "@mui/material";

import AppShell from "../../components/AppShell";
import type { ChartDataItem } from "./ChartsRenderer";

const ChartsRenderer = dynamic(() => import("./ChartsRenderer"), {
  ssr: false,
});

/** بنية صف البيانات */
const ChartsReportsPage: React.FC = () => {
  // نوع التقرير (لا يتطلب الفصل بين temp/final غالباً)
  const [reportType, setReportType] = useState<string>("");

  // هنا الفرق: نملك periodين: مؤقت (tempPeriod) والنهائي (finalPeriod)
  const [tempPeriod, setTempPeriod] = useState<string>("daily");
  const [finalPeriod, setFinalPeriod] = useState<string>(""); // فارغ في البداية أو "daily"

  // الفلاتر الخاصة بك (تواريخ بدء ونهاية، إلخ)
  const [filters, setFilters] = useState<any>({});

  // عند الضغط على زر Generate Chart نجلب البيانات ونحدثها هنا
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const REPORT_TYPES = [
    { value: "", label: "Select a Report" },
    { value: "sales", label: "Sales Chart" },
    { value: "expenses", label: "Expenses Chart" },
    { value: "comparative", label: "Comparative Chart" },
    { value: "TIAR", label: "Total Inventory Assets (TIAR) Chart" },
  ];

  const PERIOD_OPTIONS = [
    { value: "daily", label: "Daily" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  // تغير قيم الفلاتر
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  // الدالة التي تستدعي السيرفر بعد تثبيت finalPeriod
  const fetchChartData = async (chosenPeriod: string) => {
    if (!reportType) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/charts/${reportType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // نستخدم chosenPeriod (وهو finalPeriod) بدلاً من tempPeriod
        body: JSON.stringify({ filters: { ...filters, period: chosenPeriod } }),
      });
      const dataFromServer = await response.json();
      setChartData(dataFromServer);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  // دالة عند الضغط على زر Generate Chart
  const handleGenerateReport = () => {
    // ثبت القيمة النهائية لـ period
    setFinalPeriod(tempPeriod);

    // استدعِ fetchChartData بالقيمة الجديدة
    fetchChartData(tempPeriod);
  };

  // يتحكم بزر Generate (لا يُسمح إلا بعد اختيار reportType)
  const canGenerate = useMemo(() => {
    if (!reportType) return false;

    // أنواع التقارير التي تحتاج تاريخ
    const needsDate = ["sales", "expenses", "profitability", "comparative"];
    if (needsDate.includes(reportType)) {
      if (!filters.startDate || !filters.endDate) {
        return false;
      }
    }
    return true;
  }, [reportType, filters.startDate, filters.endDate]);

  /**
   * formatLabel يستخدم finalPeriod بدلاً من period
   * لأنه لا يتغير إلا عند الضغط على زر Generate
   */
  const formatLabel = (val: string) => {
    if (!val) return val;

    if (finalPeriod === "yearly") {
      // يفترض أن val = "2025" مثلًا
      return val;
    } else if (finalPeriod === "monthly") {
      // يفترض val = "2025-09"
      const parts = val.split("-");
      if (parts.length === 2) {
        const [year, rawMonth] = parts;
        const monthNum = parseInt(rawMonth, 10);
        if (monthNum >= 1 && monthNum <= 12) {
          const dateObj = new Date(parseInt(year), monthNum - 1);
          const monthName = new Intl.DateTimeFormat("en", {
            month: "short",
          }).format(dateObj);
          return `${monthName} ${year}`;
        }
      }
      return val;
    } else {
      // daily
      const dateObj = new Date(val);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("en-UK");
      }
      return val;
    }
  };

  const formatNumber = (val: number) => {
    if (typeof val !== "number") return String(val);
    return val.toLocaleString("en-US");
  };

  // فرز المصاريف في حال كان التقرير expenses
  const finalChartData = useMemo(() => {
    if (reportType === "expenses") {
      return [...chartData].sort((a, b) => b.value1 - a.value1);
    }
    return chartData;
  }, [chartData, reportType]);

  const chartMargins = { top: 30, right: 50, left: 50, bottom: 40 };

  return (
    <AppShell A="احصائيات">
      <Box sx={{ p: 3 }}>
        
        <Card sx={{ mb: 2 }}>
          <CardContent>
          <Typography variant="h4" gutterBottom>
          Charts Reports
        </Typography>

            <Grid container spacing={2} alignItems="center">
              {/* Select Report */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Select a Report</InputLabel>
                  <Select
                    value={reportType}
                    label="Select a Report"
                    onChange={(e) => {
                      setReportType(e.target.value as string);
                      setChartData([]);
                    }}
                  >
                    {REPORT_TYPES.map((rt) => (
                      <MenuItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* هنا نستخدم tempPeriod */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={tempPeriod}
                    label="Period"
                    onChange={(e) => setTempPeriod(e.target.value as string)}
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {(reportType === "sales" ||
                reportType === "expenses" ||
                reportType === "profitability" ||
                reportType === "comparative") && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Start Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filters.startDate || ""}
                      onChange={(e) =>
                        handleFilterChange("startDate", e.target.value)
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="End Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={filters.endDate || ""}
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
                      }
                    />
                  </Grid>
                </>
              )}

              {reportType === "sales" && (
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Employee"
                    fullWidth
                    value={filters.employee || ""}
                    onChange={(e) =>
                      handleFilterChange("employee", e.target.value)
                    }
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={!canGenerate}
                >
                  Generate Chart
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <CircularProgress />
        ) : (
          <Card>
            <CardContent>
              {!reportType ? (
                <Typography>اختر نوع التقرير</Typography>
              ) : finalChartData.length === 0 ? (
                <Typography>لا توجد بيانات للعرض</Typography>
              ) : (
                <Box sx={{ width: "100%", height: 400 }}>
                  <ChartsRenderer
                    chartData={finalChartData}
                    reportType={reportType}
                    chartMargins={chartMargins}
                    formatLabel={formatLabel}
                    formatNumber={formatNumber}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </AppShell>
  );
};

export default ChartsReportsPage;
