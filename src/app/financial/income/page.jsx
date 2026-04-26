"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import axios from "axios";

import AppShell from "@/app/components/AppShell";

const ExpenseModal = dynamic(() => import("@/app/components/ExpenseModal"), {
  ssr: false,
});

const IncomeTables = dynamic(() => import("./IncomeTables"), {
  ssr: false,
});

const summaryCardSx = {
  height: "100%",
  borderRadius: 3,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  border: "1px solid rgba(15, 23, 42, 0.06)",
};

const primaryActionSx = {
  borderRadius: "12px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  textTransform: "none",
  backgroundColor: "#386e6e",
  color: "white",
  "&:hover": {
    backgroundColor: "#2e5a5a",
  },
};

const secondaryActionSx = {
  borderRadius: "12px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  textTransform: "none",
  borderColor: "rgba(56,110,110,0.25)",
  color: "#234848",
  backgroundColor: "rgba(255,255,255,0.78)",
  "&:hover": {
    borderColor: "rgba(56,110,110,0.45)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
};

function SummaryCard({ title, value, helper, icon, color }) {
  return (
    <Card sx={summaryCardSx}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography
              sx={{
                fontFamily: "Alexandria, sans-serif",
                fontSize: "12px",
                color: "text.secondary",
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontFamily: "Alexandria, sans-serif",
                fontSize: "26px",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {value}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontFamily: "Alexandria, sans-serif",
                fontSize: "12px",
                color: "text.secondary",
              }}
            >
              {helper}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              backgroundColor: `${color}14`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function normalizeMoneyRows(rows) {
  return rows.map((item) => ({
    ...item,
    MoneyPaid: Math.abs(Number(item.MoneyPaid ?? 0)),
  }));
}

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA");
}

export default function IncomePage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [incomeData, setIncomeData] = useState([]);
  const [spendsData, setSpendsData] = useState([]);
  const [dailySpendsData, setDailySpendsData] = useState([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [incomePage, setIncomePage] = useState(0);
  const [spendsPage, setSpendsPage] = useState(0);
  const [totalMoneyPaid, setTotalMoneyPaid] = useState(0);
  const [openExpenseForm, setOpenExpenseForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [appliedExpenseSearchQuery, setAppliedExpenseSearchQuery] = useState("");
  const [expenseSearchApplied, setExpenseSearchApplied] = useState(false);

  const getData = useCallback(async (date, expenseSearch = "") => {
    setIncomeData([]);
    setSpendsData([]);
    setDailySpendsData([]);
    setError("");
    setLoading(true);

    try {
      const response = await axios.get(`/api/financials/income/${date}`, {
        params: expenseSearch ? { expenseSearch } : undefined,
      });

      const incomeRows = Array.isArray(response.data?.incomeRows) ? response.data.incomeRows : [];
      const expenseRows = Array.isArray(response.data?.expenseRows)
        ? response.data.expenseRows
        : [];
      const dailyExpenseRows = Array.isArray(response.data?.dailyExpenseRows)
        ? response.data.dailyExpenseRows
        : [];

      setTotalMoneyPaid(Number(response.data?.totalMoneyPaid ?? 0));
      setExpenseSearchApplied(Boolean(response.data?.expenseSearchApplied));
      setIncomeData(incomeRows);
      setSpendsData(normalizeMoneyRows(expenseRows));
      setDailySpendsData(normalizeMoneyRows(dailyExpenseRows));
      setIncomePage(0);
      setSpendsPage(0);
    } catch (fetchError) {
      console.error("Error fetching financial income data:", fetchError);
      setError("تعذر تحميل بيانات الدخل والمصروفات.");
      setTotalMoneyPaid(0);
      setExpenseSearchApplied(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      getData(selectedDate, appliedExpenseSearchQuery);
    }
  }, [appliedExpenseSearchQuery, getData, selectedDate]);

  useEffect(() => {
    setSpendsPage(0);
  }, [appliedExpenseSearchQuery]);

  const handleCloseExpenseForm = () => {
    setOpenExpenseForm(false);
    if (selectedDate) {
      getData(selectedDate, appliedExpenseSearchQuery);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setIncomePage(0);
    setSpendsPage(0);
  };

  const handleApplyExpenseSearch = () => {
    setAppliedExpenseSearchQuery(expenseSearchQuery.trim());
  };

  const handleSearchFieldKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleApplyExpenseSearch();
    }
  };

  const totalIncome = useMemo(
    () => incomeData.reduce((acc, item) => acc + Number(item.MoneyPaid ?? 0), 0),
    [incomeData],
  );
  const totalSpends = useMemo(
    () => dailySpendsData.reduce((acc, item) => acc + Number(item.MoneyPaid ?? 0), 0),
    [dailySpendsData],
  );
  const dailyNetIncome = totalIncome - totalSpends;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IQD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const hasPendingSearchChange = expenseSearchQuery.trim() !== appliedExpenseSearchQuery;

  return (
    <AppShell
      A="الدخل والمصروفات"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {openExpenseForm ? (
        <Dialog open={openExpenseForm} onClose={handleCloseExpenseForm} maxWidth="xl" fullWidth>
          <ExpenseModal handleClose={handleCloseExpenseForm} />
        </Dialog>
      ) : null}

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Card
          sx={{
            mb: 3,
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
            background:
              "linear-gradient(135deg, rgba(243,247,247,1) 0%, rgba(232,242,242,1) 100%)",
            border: "1px solid rgba(56,110,110,0.10)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", lg: "center" }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: { xs: "24px", md: "30px" },
                    fontWeight: 600,
                    color: "#123232",
                  }}
                >
                  لوحة الدخل والمصروفات
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    maxWidth: 820,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                    color: "rgba(18, 50, 50, 0.78)",
                  }}
                >
                  التاريخ هنا مخصص لملخص اليوم فقط. أما البحث العام في المصروفات فلا يُنفذ إلا
                  عند الضغط على زر البحث، وتُعرض نتائجه مع تاريخ الصرف من كامل السجل.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={() => setOpenExpenseForm(true)}
                  sx={primaryActionSx}
                >
                  إضافة مصروفات جديدة
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => getData(selectedDate, appliedExpenseSearchQuery)}
                  sx={secondaryActionSx}
                  disabled={loading}
                >
                  تحديث البيانات
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.25} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="صافي الدخل اليومي"
              value={formatCurrency(dailyNetIncome)}
              helper="الدخل مطروحاً منه مصروفات التاريخ المحدد"
              icon={<SavingsOutlinedIcon />}
              color="#386e6e"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="إجمالي الدخل"
              value={formatCurrency(totalIncome)}
              helper={`عدد حركات الدخل: ${incomeData.length.toLocaleString("en-US")}`}
              icon={<PaidOutlinedIcon />}
              color="#2e7d32"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="إجمالي مصروفات اليوم"
              value={formatCurrency(totalSpends)}
              helper={`عدد مصروفات التاريخ المحدد: ${dailySpendsData.length.toLocaleString("en-US")}`}
              icon={<ReceiptLongOutlinedIcon />}
              color="#c62828"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="رصيد الصندوق الكلي"
              value={formatCurrency(totalMoneyPaid)}
              helper="الرصيد الحالي في الصندوق"
              icon={<PaymentsOutlinedIcon />}
              color="#7b1fa2"
            />
          </Grid>
        </Grid>

        <Card sx={summaryCardSx}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={2.25}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "19px",
                      fontWeight: 600,
                      color: "#0f172a",
                    }}
                  >
                    فلترة اليوم والبحث العام
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    غيّر التاريخ لتحديث ملخص اليوم. استخدم زر البحث لتشغيل بحث عام في
                    المصروفات فقط، من دون ربط النتائج بتاريخ محدد.
                  </Typography>
                </Box>

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.2}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  <TextField
                    label="اختر التاريخ"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      minWidth: { xs: "100%", md: 220 },
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "14px",
                        direction: "rtl",
                      },
                      "& .MuiInputLabel-root": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        direction: "rtl",
                      },
                    }}
                  />
                  <TextField
                    label="بحث عام في كل المصروفات"
                    value={expenseSearchQuery}
                    onChange={(event) => setExpenseSearchQuery(event.target.value)}
                    onKeyDown={handleSearchFieldKeyDown}
                    helperText="ابحث بالاسم أو التفاصيل، ثم اضغط زر البحث."
                    sx={{
                      minWidth: { xs: "100%", md: 360 },
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "13px",
                        direction: "rtl",
                      },
                      "& .MuiInputLabel-root, & .MuiFormHelperText-root": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        direction: "rtl",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleApplyExpenseSearch}
                    sx={primaryActionSx}
                    disabled={loading || !hasPendingSearchChange}
                  >
                    بحث المصروفات
                  </Button>
                </Stack>
              </Stack>

              <Alert
                severity="info"
                sx={{
                  borderRadius: 3,
                  "& .MuiAlert-message": {
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                  },
                }}
              >
                {expenseSearchApplied
                  ? "تم تفعيل البحث العام في المصروفات. النتائج الحالية لا تعتمد على التاريخ المحدد، ويظهر معها تاريخ الصرف لكل حركة. لتغيير النتائج اكتب قيمة جديدة ثم اضغط زر البحث."
                  : "لم يتم تشغيل البحث العام بعد. عند كتابة الاسم أو التفاصيل ثم الضغط على زر البحث، سيجلب النظام النتائج من كامل سجل المصروفات."}
              </Alert>
            </Stack>
          </CardContent>
        </Card>

        {error ? (
          <Alert severity="error" sx={{ mt: 3, fontFamily: "Alexandria, sans-serif" }}>
            {error}
          </Alert>
        ) : null}

        <Box sx={{ mt: 3 }}>
          {loading ? (
            <Card sx={summaryCardSx}>
              <CardContent
                sx={{
                  py: 9,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Stack spacing={1.5} alignItems="center">
                  <CircularProgress />
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    جارٍ تحميل الحركات المالية...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <IncomeTables
              incomeData={incomeData}
              spendsData={spendsData}
              rowsPerPage={rowsPerPage}
              incomePage={incomePage}
              spendsPage={spendsPage}
              onIncomePageChange={(_event, newPage) => setIncomePage(newPage)}
              onSpendsPageChange={(_event, newPage) => setSpendsPage(newPage)}
              onRowsPerPageChange={handleChangeRowsPerPage}
              formatCurrency={formatCurrency}
              spendsDateLabel={expenseSearchApplied ? "تاريخ الصرف" : "التاريخ"}
              spendsBadgeLabel={expenseSearchApplied ? "نتائج بحث عامة" : "الحركات السالبة"}
              spendsEmptyLabel={
                expenseSearchApplied
                  ? "لا توجد نتائج مطابقة في كامل سجل المصروفات."
                  : "لا توجد مصروفات في التاريخ المحدد."
              }
            />
          )}
        </Box>
      </Box>
    </AppShell>
  );
}
