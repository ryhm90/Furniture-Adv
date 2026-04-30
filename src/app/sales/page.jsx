"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

import AppShell from "../components/AppShell";

const SalesForm = dynamic(() => import("../components/SalesForm"), { ssr: false });
const PaymentForm = dynamic(() => import("../components/PaymentForm"), {
  ssr: false,
});
const ViewForm = dynamic(() => import("../components/ViewForm"), { ssr: false });
const ConfirmDialog = dynamic(() => import("../components/ConfirmDialog"), {
  ssr: false,
});
const SalesResultsTable = dynamic(() => import("./SalesResultsTable"), {
  ssr: false,
});
const DriverBulkPaymentDialog = dynamic(() => import("./DriverBulkPaymentDialog"), {
  ssr: false,
});
const SalesTelegramInboxPanel = dynamic(() => import("./SalesTelegramInboxPanel"), {
  ssr: false,
});

const actionButtonSx = {
  borderRadius: "12px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  gap: 1,
  textTransform: "none",
  whiteSpace: "nowrap",
  "& .MuiButton-startIcon, & .MuiButton-endIcon": {
    margin: 0,
  },
};

const primaryActionSx = {
  ...actionButtonSx,
  backgroundColor: "#386e6e",
  color: "white",
  "&:hover": {
    backgroundColor: "#2e5a5a",
    borderColor: "#2e5a5a",
  },
};

const secondaryActionSx = {
  ...actionButtonSx,
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

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function Sales() {
  const { data: session } = useSession();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [selectedviewInvoice, setSelectedviewInvoice] = useState(null);
  const [viewDialogOpen, setviewDialogOpen] = useState(false);
  const [driverNames, setDriverNames] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [driverBulkDialogOpen, setDriverBulkDialogOpen] = useState(false);
  const [driverBulkInvoices, setDriverBulkInvoices] = useState([]);
  const [driverBulkLoading, setDriverBulkLoading] = useState(false);
  const [telegramRequests, setTelegramRequests] = useState([]);
  const [telegramSummary, setTelegramSummary] = useState({
    all: 0,
    pending: 0,
    executed: 0,
  });
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramStatusFilter, setTelegramStatusFilter] = useState("pending");
  const [selectedTelegramRequestId, setSelectedTelegramRequestId] = useState(null);
  const [showTelegramPanel, setShowTelegramPanel] = useState(true);

  useEffect(() => {
    const fetchDriverNames = async () => {
      try {
        const response = await axios.get("/api/worker-names", { cache: "no-store" });
        setDriverNames(response.data.driverNames);
      } catch (error) {
        console.error("Error fetching driver names:", error);
      }
    };

    fetchDriverNames();
  }, []);

  const fetchTelegramRequests = useCallback(async () => {
    setTelegramLoading(true);

    try {
      const response = await axios.get("/api/sales/telegram-inbox", {
        params: { status: telegramStatusFilter },
        cache: "no-store",
      });

      const nextItems = Array.isArray(response.data?.items) ? response.data.items : [];
      setTelegramRequests(nextItems);
      setTelegramSummary(
        response.data?.summary ?? {
          all: 0,
          pending: 0,
          executed: 0,
        },
      );

      setSelectedTelegramRequestId((currentValue) =>
        nextItems.some((item) => item.id === currentValue) ? currentValue : null,
      );
    } catch (error) {
      console.error("Error fetching Telegram sales inbox:", error);
      toast.error("تعذر تحميل طلبات التليغرام.");
    } finally {
      setTelegramLoading(false);
    }
  }, [telegramStatusFilter]);

  const fetchDriverBulkInvoices = useCallback(async (driverName) => {
    if (!driverName || driverName === "Null") {
      setDriverBulkInvoices([]);
      return [];
    }

    setDriverBulkLoading(true);

    try {
      const response = await axios.get("/api/sellmoney/driver-payments", {
        params: { driver: driverName },
        cache: "no-store",
      });

      const rows = Array.isArray(response.data) ? response.data : [];
      setDriverBulkInvoices(rows);
      return rows;
    } catch (error) {
      console.error("Error fetching driver bulk payment invoices:", error);
      toast.error("تعذر تحميل وصولات السائق الخاصة بالتسديد.");
      setDriverBulkInvoices([]);
      return [];
    } finally {
      setDriverBulkLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!formOpen) {
      return;
    }

    fetchTelegramRequests();
  }, [fetchTelegramRequests, formOpen]);

  useEffect(() => {
    if (!session?.user?.role) {
      return;
    }

    fetchTelegramRequests();
  }, [fetchTelegramRequests, session?.user?.role]);

  useEffect(() => {
    if (selectedDriver && selectedDriver !== "Null") {
      return;
    }

    setDriverBulkDialogOpen(false);
    setDriverBulkInvoices([]);
  }, [selectedDriver]);

  const selectedTelegramRequest = useMemo(
    () => telegramRequests.find((item) => item.id === selectedTelegramRequestId) ?? null,
    [selectedTelegramRequestId, telegramRequests],
  );
  const activeInvoicesCount = useMemo(
    () => data.filter((item) => item.Por !== "ملغى").length,
    [data],
  );
  const pendingTelegramCount = useMemo(() => telegramSummary?.pending ?? 0, [telegramSummary]);
  const remainingBalance = useMemo(
    () =>
      data
        .reduce((sum, item) => sum + Number(item.MoneyRemain ?? 0), 0)
        .toLocaleString("en-US"),
    [data],
  );
  const searchStatusLabel = useMemo(() => {
    if (searchQuery.trim()) {
      return `بحث باسم: ${searchQuery.trim()}`;
    }

    if (selectedDriver) {
      return selectedDriver === "Null" ? "بحث بالسائق غير المعيّن" : `بحث بالسائق: ${selectedDriver}`;
    }

    return selectedDate ? `تاريخ ${selectedDate}` : "بدون فلتر";
  }, [searchQuery, selectedDate, selectedDriver]);

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
      await axios.get("/api/sellmoney/sum", {
        params: { invonum: invoiceToDelete.InvoNum },
      });

      const entryResponse = await axios.get("/api/entrytable", {
        params: { invonum: invoiceToDelete.InvoNum },
      });

      const entries = entryResponse.data.entries;

      for (const { roomnum, countt, flagf } of entries) {
        await axios.put("/api/entrytable/update", {
          roomnum,
          decrementBy: countt,
          flagf,
          sellor: invoiceToDelete.sellor,
        });
      }

      await axios.put("/api/sellmoney/cancel", {
        invonum: invoiceToDelete.InvoNum,
        status: "ملغى",
        sellor: invoiceToDelete.sellor,
      });

      toast.success("تم إلغاء الوصل وتحديث البيانات المرتبطة بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("تعذر إلغاء الوصل.");
    } finally {
      setInvoiceToDelete(null);
    }
  };

  const handleSearchClick = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/search/sellmoney?query=${searchQuery}&date=${selectedDate || ""}&driver=${selectedDriver}`,
      );
      const result = await response.json();
      setData(result);
      setPage(0);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleOpenPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleOpenDriverBulkPaymentDialog = async () => {
    if (!selectedDriver || selectedDriver === "Null") {
      toast.info("اختر سائقاً محدداً أولاً.");
      return;
    }

    setDriverBulkDialogOpen(true);
    await fetchDriverBulkInvoices(selectedDriver);
  };

  const handleViewIconClick = (invoice) => {
    setSelectedviewInvoice(invoice);
    setviewDialogOpen(true);
  };

  const handleSavePayment = async () => {
    setSelectedInvoice(null);
    setPaymentDialogOpen(false);

    if (hasSearched) {
      await handleSearchClick();
    }

    if (driverBulkDialogOpen && selectedDriver && selectedDriver !== "Null") {
      await fetchDriverBulkInvoices(selectedDriver);
    }
  };

  const handleClosePaymentDialog = async () => {
    setSelectedInvoice(null);
    setPaymentDialogOpen(false);

    if (hasSearched) {
      await handleSearchClick();
    }

    if (driverBulkDialogOpen && selectedDriver && selectedDriver !== "Null") {
      await fetchDriverBulkInvoices(selectedDriver);
    }
  };

  const handleOpenSalesForm = async () => {
    setShowTelegramPanel(true);
    setFormOpen(true);
  };

  const handleCloseSalesForm = () => {
    setFormOpen(false);
    setSelectedTelegramRequestId(null);
    handleSearchClick();
  };

  const handleToggleTelegramRequestStatus = async (request) => {
    try {
      await axios.patch(`/api/sales/telegram-inbox/${request.id}`, {
        isExecuted: !request.isExecuted,
      });

      toast.success(request.isExecuted ? "تمت إعادة الطلب إلى غير منفذ." : "تم تسجيل الطلب كمنفذ.");
      await fetchTelegramRequests();
    } catch (error) {
      console.error("Error updating Telegram inbox item:", error);
      toast.error("تعذر تحديث حالة الطلب.");
    }
  };

  const handleTelegramRequestExecuted = async (requestId, invoiceNumber) => {
    try {
      await axios.patch(`/api/sales/telegram-inbox/${requestId}`, {
        isExecuted: true,
        linkedInvoiceNumber: invoiceNumber,
      });

      await fetchTelegramRequests();
      setSelectedTelegramRequestId(null);
    } catch (error) {
      console.error("Error marking Telegram request as executed:", error);
      toast.error("تم حفظ الوصل لكن تعذر تحديث حالة طلب التليغرام.");
    }
  };

  const handleRefreshPage = async () => {
    await fetchTelegramRequests();

    if (hasSearched) {
      await handleSearchClick();
    }

    if (driverBulkDialogOpen && selectedDriver && selectedDriver !== "Null") {
      await fetchDriverBulkInvoices(selectedDriver);
    }
  };

  return (
    <AppShell
      A="المبيعات"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {formOpen ? (
        <SalesForm
          open={formOpen}
          handleClose={handleCloseSalesForm}
          selectedTelegramRequest={selectedTelegramRequest}
          isTelegramPanelVisible={showTelegramPanel}
          onToggleTelegramPanel={() => setShowTelegramPanel((currentValue) => !currentValue)}
          onTelegramRequestExecuted={handleTelegramRequestExecuted}
          telegramPanel={
            <SalesTelegramInboxPanel
              requests={telegramRequests}
              summary={telegramSummary}
              statusFilter={telegramStatusFilter}
              isLoading={telegramLoading}
              selectedId={selectedTelegramRequestId}
              onStatusFilterChange={setTelegramStatusFilter}
              onRefresh={fetchTelegramRequests}
              onSelectRequest={(request) => setSelectedTelegramRequestId(request.id)}
              onToggleStatus={handleToggleTelegramRequestStatus}
            />
          }
        />
      ) : null}

      {viewDialogOpen && selectedviewInvoice ? (
        <ViewForm
          open={viewDialogOpen}
          onClose={() => {
            setviewDialogOpen(false);
            handleSearchClick();
          }}
          inv={selectedviewInvoice}
        />
      ) : null}

      {paymentDialogOpen && selectedInvoice ? (
        <PaymentForm
          open={paymentDialogOpen}
          onClose={handleClosePaymentDialog}
          moneyRemain={selectedInvoice?.MoneyRemain}
          inv={selectedInvoice}
          onSave={handleSavePayment}
        />
      ) : null}

      {driverBulkDialogOpen ? (
        <DriverBulkPaymentDialog
          open={driverBulkDialogOpen}
          driverName={selectedDriver === "Null" ? "" : selectedDriver}
          rows={driverBulkInvoices}
          isLoading={driverBulkLoading}
          onClose={() => setDriverBulkDialogOpen(false)}
          onPayment={handleOpenPaymentDialog}
        />
      ) : null}

      {confirmDeleteDialogOpen ? (
        <ConfirmDialog
          open={confirmDeleteDialogOpen}
          onClose={() => setConfirmDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title="هل أنت متأكد؟"
          description="هل أنت متأكد من إلغاء وصل البيع؟"
          confirmLabel="نعم"
          cancelLabel="لا"
        />
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
                  لوحة المبيعات اليومية
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    maxWidth: 780,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                    color: "rgba(18, 50, 50, 0.78)",
                  }}
                >
                  متابعة وصولات البيع، الطلبات الواردة من التليغرام والصفحة العامة، البحث
                  السريع، وتنفيذ إجراءات العرض والتسديد والإلغاء من واجهة موحدة.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<AddCircleIcon />}
                  onClick={handleOpenSalesForm}
                  sx={primaryActionSx}
                >
                  إضافة وصل بيع جديد
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshPage}
                  sx={secondaryActionSx}
                  disabled={loading || telegramLoading}
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
              title="الوصول النشطة"
              value={activeInvoicesCount.toLocaleString("en-US")}
              helper="عدد وصولات البيع غير الملغاة ضمن النتائج الحالية"
              icon={<ReceiptLongOutlinedIcon />}
              color="#386e6e"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="الرصيد المتبقي"
              value={remainingBalance}
              helper="إجمالي المبالغ غير المسددة ضمن الوصلات المعروضة"
              icon={<AttachMoneyOutlinedIcon />}
              color="#1565c0"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="طلبات قيد التنفيذ"
              value={pendingTelegramCount.toLocaleString("en-US")}
              helper="طلبات التليغرام والصفحة العامة غير المنفذة حالياً"
              icon={<PendingActionsOutlinedIcon />}
              color="#f57c00"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="نتائج البحث"
              value={data.length.toLocaleString("en-US")}
              helper={hasSearched ? searchStatusLabel : "ابدأ بالبحث لعرض النتائج"}
              icon={<ManageSearchIcon />}
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
                    البحث والمتابعة
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    ابحث باسم الزبون أو بالتاريخ أو بالسائق، ثم نفّذ إجراءات العرض أو التسديد
                    أو الإلغاء من نفس الجدول.
                  </Typography>
                </Box>
              </Stack>

              {pendingTelegramCount > 0 ? (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 3,
                    alignItems: "center",
                    "& .MuiAlert-message": {
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.9,
                    },
                  }}
                >
                  توجد {pendingTelegramCount.toLocaleString("en-US")} طلبات غير منفذة في وارد
                  التليغرام والطلبات العامة. يمكنك فتح حوار إضافة الوصل لربطها مباشرة.
                </Alert>
              ) : null}

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="بحث باسم الزبون"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSelectedDriver("");
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                      },
                      "& .MuiInputLabel-root": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
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
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="تاريخ البيع"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setSelectedDriver("");
                      setSearchQuery("");
                    }}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                      },
                      "& .MuiInputLabel-root": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl
                    fullWidth
                    variant="outlined"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                      },
                      "& .MuiInputLabel-root": {
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                      },
                    }}
                  >
                    <InputLabel>السائق</InputLabel>
                    <Select
                      value={selectedDriver}
                      onChange={(event) => {
                        setSelectedDriver(event.target.value);
                        setSearchQuery("");
                      }}
                      label="السائق"
                    >
                      {driverNames.map((driver, index) => (
                        <MenuItem
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            fontWeight: 400,
                            fontSize: "13px",
                            direction: "rtl",
                          }}
                          key={index}
                          value={driver}
                        >
                          {driver}
                        </MenuItem>
                      ))}
                      <MenuItem
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "13px",
                          direction: "rtl",
                        }}
                        key="null-option"
                        value="Null"
                      >
                        غير معيّن
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={2}>
                  <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.2}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                      onClick={handleSearchClick}
                      sx={primaryActionSx}
                      disabled={loading}
                    >
                      بحث
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefreshPage}
                      sx={secondaryActionSx}
                      disabled={loading || telegramLoading}
                    >
                      تحديث
                    </Button>
                  </Stack>
                </Grid>
              </Grid>

              {selectedDriver && selectedDriver !== "Null" ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button
                    variant="outlined"
                    startIcon={<AttachMoneyOutlinedIcon />}
                    onClick={handleOpenDriverBulkPaymentDialog}
                    sx={secondaryActionSx}
                    disabled={driverBulkLoading}
                  >
                    {driverBulkLoading ? "جاري تحميل الوصولات..." : "تسديد جماعي حسب السائق"}
                  </Button>
                </Stack>
              ) : null}

              <Alert
                severity={hasSearched ? "success" : "info"}
                sx={{
                  borderRadius: 3,
                  alignItems: "center",
                  "& .MuiAlert-message": {
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                  },
                }}
              >
                {hasSearched
                  ? `الفلاتر الحالية: ${searchStatusLabel}`
                  : "لم يتم تنفيذ أي بحث بعد. اختر طريقة البحث المناسبة ثم اضغط على زر البحث."}
              </Alert>
            </Stack>
          </CardContent>
        </Card>

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
                    جارٍ تحميل نتائج البحث...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {!loading && !hasSearched ? (
            <Card sx={summaryCardSx}>
              <CardContent sx={{ py: { xs: 6, md: 8 } }}>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <ManageSearchIcon sx={{ fontSize: 42, color: "rgba(56,110,110,0.7)" }} />
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#123232",
                    }}
                  >
                    نتائج المبيعات ستظهر هنا
                  </Typography>
                  <Typography
                    sx={{
                      maxWidth: 520,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.9,
                      color: "text.secondary",
                    }}
                  >
                    ابدأ ببحث حسب الاسم أو التاريخ أو السائق لعرض الوصول، متابعة الرصيد
                    المتبقي، وتنفيذ إجراءات العرض أو التسديد أو الإلغاء.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {!loading && hasSearched ? (
            <Card sx={summaryCardSx}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    spacing={1}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "18px",
                          fontWeight: 600,
                          color: "#0f172a",
                        }}
                      >
                        نتائج البحث
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.5,
                          fontFamily: "Alexandria, sans-serif",
                          fontSize: "13px",
                          color: "text.secondary",
                        }}
                      >
                        {searchStatusLabel}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "13px",
                        color: "text.secondary",
                      }}
                    >
                      عدد السجلات: {data.length.toLocaleString("en-US")}
                    </Typography>
                  </Stack>

                  <SalesResultsTable
                    role={session?.user?.role}
                    data={data}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    onView={handleViewIconClick}
                    onPayment={handleOpenPaymentDialog}
                    onDelete={handleDelete}
                  />
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Box>
      </Box>
    </AppShell>
  );
}

export default Sales;
