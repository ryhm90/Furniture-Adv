"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";

import AppShell from "../components/AppShell";

const ViewForm = dynamic(() => import("../components/ViewForm"), {
  ssr: false,
});
const PaymentForm = dynamic(() => import("../components/PaymentForm"), {
  ssr: false,
});
const ConfirmDialog = dynamic(() => import("../components/ConfirmDialog"), {
  ssr: false,
});
const DashboardAppointmentsTable = dynamic(() => import("./DashboardAppointmentsTable"), {
  ssr: false,
});

const actionButtonSx = {
  borderRadius: "12px",
  backgroundColor: "#386e6e",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  textTransform: "none",
  "&:hover": {
    backgroundColor: "#2e5a5a",
    borderColor: "#2e5a5a",
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

const summaryCardSx = {
  height: "100%",
  borderRadius: 3,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  border: "1px solid rgba(15, 23, 42, 0.06)",
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

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString("ar-IQ");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA");
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    salescount: 0,
    providecount: 0,
    provideallcount: 0,
    preparedTodayCount: 0,
    remainingAmountToday: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate] = useState(() => getTodayDate());
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedViewInvoice, setSelectedViewInvoice] = useState(null);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { data: session } = useSession();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [appointmentsResponse, statusResponse] = await Promise.all([
        axios.get(`/api/search/sellmoney?date=${selectedDate}`),
        axios.get("/api/dashboard/status"),
      ]);

      setAppointments(Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data : []);
      setStatusCounts({
        salescount: Number(statusResponse.data?.salescount || 0),
        providecount: Number(statusResponse.data?.providecount || 0),
        provideallcount: Number(statusResponse.data?.provideallcount || 0),
        preparedTodayCount: Number(statusResponse.data?.preparedTodayCount || 0),
        remainingAmountToday: Number(statusResponse.data?.remainingAmountToday || 0),
      });
    } catch (fetchError) {
      console.error("Error fetching dashboard data:", fetchError);
      setError("تعذر تحميل بيانات لوحة التحكم.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAppointments = useMemo(() => {
    let currentRows = appointments;

    if (activeFilter !== "All") {
      currentRows = currentRows.filter((appointment) => appointment.Por === activeFilter);
    }

    if (searchText.trim()) {
      const normalizedQuery = searchText.trim().toLowerCase();
      currentRows = currentRows.filter((appointment) =>
        [appointment.ClName, appointment.CellPhone, appointment.CellPhone1]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
      );
    }

    return currentRows;
  }, [activeFilter, appointments, searchText]);

  const handleViewInvoice = (invoice) => {
    setSelectedViewInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleOpenPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) {
      return;
    }

    setConfirmDeleteDialogOpen(false);

    try {
      const entryResponse = await axios.get("/api/entrytable", {
        params: { invonum: invoiceToDelete.InvoNum },
      });
      const entries = entryResponse.data.entries || [];

      for (const { roomnum, countt } of entries) {
        await axios.put("/api/entrytable/update", {
          roomnum,
          decrementBy: countt,
        });
      }

      await axios.put("/api/sellmoney/cancel", {
        invonum: invoiceToDelete.InvoNum,
        status: "ملغى",
      });

      toast.success("تم إلغاء الوصل وتحديث البيانات المرتبطة بنجاح.");
      await fetchData();
    } catch (requestError) {
      console.error("Error deleting invoice:", requestError);
      toast.error("تعذر إلغاء الوصل.");
    } finally {
      setInvoiceToDelete(null);
    }
  };

  const filterButtons = [
    { key: "All", label: "الكل" },
    { key: "غير مجهز", label: "غير مجهز" },
    { key: "مجهز", label: "مجهز" },
    { key: "ملغى", label: "ملغى" },
  ];

  return (
    <AppShell
      A="لوحة التحكم"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {viewDialogOpen && selectedViewInvoice ? (
        <ViewForm
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          inv={selectedViewInvoice}
        />
      ) : null}

      {paymentDialogOpen && selectedInvoice ? (
        <PaymentForm
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            fetchData();
          }}
          moneyRemain={selectedInvoice?.MoneyRemain}
          inv={selectedInvoice}
          onSave={() => {
            setSelectedInvoice(null);
            setPaymentDialogOpen(false);
          }}
        />
      ) : null}

      {confirmDeleteDialogOpen ? (
        <ConfirmDialog
          open={confirmDeleteDialogOpen}
          onClose={() => setConfirmDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title="تأكيد إلغاء الوصل"
          description="سيتم إلغاء الوصل وإرجاع الكميات المرتبطة به إلى المخزن. هل تريد المتابعة؟"
          confirmLabel="تأكيد الإلغاء"
          cancelLabel="إلغاء"
        />
      ) : null}

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Card
            sx={{
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
                    لوحة التحكم اليومية
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.9,
                      color: "rgba(18, 50, 50, 0.78)",
                      maxWidth: 840,
                    }}
                  >
                    نظرة سريعة على وصولات اليوم، حالات التجهيز، المبالغ المتبقية، وإدارة
                    الإجراءات السريعة على الوصولات من نفس الجدول.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchData}
                  sx={secondaryActionSx}
                  disabled={loading}
                >
                  تحديث لوحة التحكم
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2.25}>
            <Grid item xs={12} sm={6} lg={2.4}>
              <SummaryCard
                title="تاريخ اليوم"
                value={formatDate(selectedDate)}
                helper="تاريخ البيانات المعروضة"
                icon={<CalendarMonthOutlinedIcon />}
                color="#182237"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <SummaryCard
                title="وصولات اليوم"
                value={statusCounts.salescount.toLocaleString("en-US")}
                helper="الوصولات غير الملغاة"
                icon={<FactCheckOutlinedIcon />}
                color="#386e6e"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <SummaryCard
                title="تجهيزات اليوم"
                value={statusCounts.providecount.toLocaleString("en-US")}
                helper="الوصولات المجدولة لليوم"
                icon={<PendingActionsOutlinedIcon />}
                color="#ffb300"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <SummaryCard
                title="المجهز اليوم"
                value={statusCounts.preparedTodayCount.toLocaleString("en-US")}
                helper="الوصولات الجاهزة اليوم"
                icon={<FactCheckOutlinedIcon />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={2.4}>
              <SummaryCard
                title="المتبقي اليوم"
                value={formatCurrency(statusCounts.remainingAmountToday)}
                helper={`غير المجهزة كلياً: ${statusCounts.provideallcount.toLocaleString("en-US")}`}
                icon={<PaymentsOutlinedIcon />}
                color="#7b1fa2"
              />
            </Grid>
          </Grid>

          <Card sx={summaryCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", lg: "center" }}
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
                    البحث والفلاتر
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    ابحث باسم الزبون أو رقم الهاتف، أو اعرض الوصولات حسب حالة التجهيز.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2}>
                  <TextField
                    placeholder="بحث باسم الزبون أو رقم الهاتف"
                    variant="filled"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    sx={{
                      minWidth: { xs: "100%", lg: 320 },
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "13px",
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
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {filterButtons.map((filterButton) => (
                      <Button
                        key={filterButton.key}
                        variant={activeFilter === filterButton.key ? "contained" : "outlined"}
                        onClick={() => setActiveFilter(filterButton.key)}
                        sx={
                          activeFilter === filterButton.key
                            ? actionButtonSx
                            : secondaryActionSx
                        }
                      >
                        {filterButton.label}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Stack>

              <Alert
                severity="info"
                sx={{
                  mt: 2,
                  borderRadius: 3,
                  "& .MuiAlert-message": {
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                  },
                }}
              >
                {activeFilter === "All"
                  ? "يعرض الجدول كل وصولات اليوم. استخدم الفلاتر للتركيز على حالة تجهيز محددة."
                  : `يعرض الجدول الآن الوصولات ذات الحالة: ${activeFilter}.`}
              </Alert>
            </CardContent>
          </Card>

          {error ? (
            <Alert severity="error" sx={{ fontFamily: "Alexandria, sans-serif" }}>
              {error}
            </Alert>
          ) : null}

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
                    جارٍ تحميل بيانات لوحة التحكم...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <DashboardAppointmentsTable
              data={filteredAppointments}
              role={session?.user?.role}
              onView={handleViewInvoice}
              onPayment={handleOpenPaymentDialog}
              onDelete={handleDelete}
            />
          )}
        </Stack>
      </Box>
    </AppShell>
  );
}
