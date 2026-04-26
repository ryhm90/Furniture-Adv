"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ConstructionIcon from "@mui/icons-material/Construction";
import LocalPrintshopIcon from "@mui/icons-material/LocalPrintshop";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
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
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

import AppShell from "../components/AppShell";

const PaymentForm = dynamic(() => import("../components/PaymentForm"), {
  ssr: false,
});
const ViewForm = dynamic(() => import("../components/ViewForm"), { ssr: false });
const PeopleManagerDialog = dynamic(() => import("./PeopleManagerDialog"), {
  ssr: false,
});
const DeliveryResultsTable = dynamic(() => import("./DeliveryResultsTable"), {
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

const summaryCardSx = {
  height: "100%",
  borderRadius: 3,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  border: "1px solid rgba(15, 23, 42, 0.06)",
};

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function SummaryCard({ title, value, helper }) {
  return (
    <Card sx={summaryCardSx}>
      <CardContent sx={{ p: 2.5 }}>
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
            fontSize: "28px",
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
      </CardContent>
    </Card>
  );
}

function Delivery() {
  const { data: session } = useSession();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedViewInvoice, setSelectedViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
  const [driverDrafts, setDriverDrafts] = useState([]);
  const [carpenterDrafts, setCarpenterDrafts] = useState([]);
  const [driversDialogOpen, setDriversDialogOpen] = useState(false);
  const [carpentersDialogOpen, setCarpentersDialogOpen] = useState(false);

  const isQuerySearch = Boolean(searchQuery.trim());
  const readyCount = useMemo(
    () => data.filter((row) => row.warehouseS === "جهزت").length,
    [data],
  );

  const fetchStaff = useCallback(async () => {
    try {
      const [driversResponse, carpentersResponse] = await Promise.all([
        axios.get("/api/delivery/drivers", { cache: "no-store" }),
        axios.get("/api/delivery/carpenters", { cache: "no-store" }),
      ]);

      const nextDrivers = Array.isArray(driversResponse.data) ? driversResponse.data : [];
      const nextCarpenters = Array.isArray(carpentersResponse.data)
        ? carpentersResponse.data
        : [];

      setDrivers(nextDrivers);
      setCarpenters(nextCarpenters);

      return {
        drivers: nextDrivers,
        carpenters: nextCarpenters,
      };
    } catch (error) {
      console.error("Error fetching delivery staff:", error);
      toast.error("تعذر تحميل قوائم السائقين وفنيي التركيب.");
      return null;
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearchClick = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/search/selldelivery?query=${encodeURIComponent(searchQuery.trim())}&date=${encodeURIComponent(isQuerySearch ? "" : selectedDate || "")}`,
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || result?.error || "تعذر جلب بيانات تقرير التجهيز.");
      }
      if (!Array.isArray(result)) {
        throw new Error("بيانات تقرير التجهيز غير صالحة.");
      }
      setData(result);
      setPage(0);
    } catch (error) {
      console.error("Error fetching delivery search results:", error);
      toast.error("تعذر تحميل نتائج البحث.");
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

  const handleViewIconClick = (invoice) => {
    setSelectedViewInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleTimeChange = async (event, type, invoiceNumber) => {
    const updatedTime = event.target.value;

    try {
      await axios.put("/api/delivery/update", {
        InvoNum: invoiceNumber,
        type,
        name: updatedTime || null,
      });
      toast.success("تم تحديث الوقت بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error updating time:", error);
      toast.error("تعذر تحديث الوقت.");
    }
  };

  const handleCarpenterChange = async (event, type, invoiceNumber) => {
    const updatedCarpenter = event.target.value;

    try {
      await axios.put("/api/delivery/update", {
        InvoNum: invoiceNumber,
        type,
        name: updatedCarpenter,
      });
      toast.success("تم تحديث فني التركيب بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error updating carpenter:", error);
      toast.error("تعذر تحديث فني التركيب.");
    }
  };

  const handleDriverChange = async (event, type, invoiceNumber) => {
    const updatedDriver = event.target.value;

    try {
      await axios.put("/api/delivery/update", {
        InvoNum: invoiceNumber,
        type,
        name: updatedDriver,
      });
      toast.success("تم تحديث السائق بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("تعذر تحديث السائق.");
    }
  };

  const handleReturnedShipment = async (invoice) => {
    try {
      await axios.put("/api/delivery/update", {
        InvoNum: invoice.InvoNum,
        type: "warehouseS",
        name: "لم تجهز",
      });
      toast.success("تم تحديث حالة التجهيز بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("تعذر تحديث حالة التجهيز.");
    }
  };

  const handleDeliveryUpdate = async (invoice) => {
    try {
      await axios.put("/api/delivery/update", {
        InvoNum: invoice.InvoNum,
        type: "warehouseS",
        name: "جهزت",
      });
      toast.success("تم تحديث حالة التجهيز بنجاح.");
      handleSearchClick();
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("تعذر تحديث حالة التجهيز.");
    }
  };

  const handleGenerateReport = async () => {
    if (isQuerySearch) {
      toast.info("طباعة تقرير التجهيز متاحة فقط عند البحث بالتاريخ.");
      return;
    }

    setLoading(true);

    try {
      const pageName = session?.user?.pageName || "اسم غير محدد";
      const response = await fetch(
        `/api/search/selldeliveryReport?query=&date=${selectedDate || ""}`,
      );
      const result = await response.json();
      const { generateReport } = await import("@/utils/generateReport");

      generateReport(result, selectedDate, pageName);
      toast.success("تم تنزيل تقرير التجهيز بنجاح.");
    } catch (error) {
      console.error("Error generating delivery report:", error);
      toast.error(error?.message || "تعذر تنزيل تقرير التجهيز.");
    } finally {
      setLoading(false);
    }
  };

  const openDriversDialog = async () => {
    const staff = await fetchStaff();
    const nextDrivers = staff?.drivers ?? drivers;
    setDriverDrafts(nextDrivers.map((item) => ({ ...item })));
    setDriversDialogOpen(true);
  };

  const openCarpentersDialog = async () => {
    const staff = await fetchStaff();
    const nextCarpenters = staff?.carpenters ?? carpenters;
    setCarpenterDrafts(nextCarpenters.map((item) => ({ ...item })));
    setCarpentersDialogOpen(true);
  };

  const saveDrivers = async () => {
    try {
      const response = await axios.put("/api/delivery/update-drivers", driverDrafts);
      const nextDrivers = Array.isArray(response.data?.items) ? response.data.items : [];
      setDrivers(nextDrivers);
      setDriverDrafts(nextDrivers.map((item) => ({ ...item })));
      toast.success("تم حفظ السائقين بنجاح.");
      setDriversDialogOpen(false);
      if (hasSearched) {
        await handleSearchClick();
      }
    } catch (error) {
      console.error("Error saving drivers:", error);
      toast.error("تعذر حفظ السائقين.");
    }
  };

  const saveCarpenters = async () => {
    try {
      const response = await axios.put("/api/delivery/update-carpenters", carpenterDrafts);
      const nextCarpenters = Array.isArray(response.data?.items) ? response.data.items : [];
      setCarpenters(nextCarpenters);
      setCarpenterDrafts(nextCarpenters.map((item) => ({ ...item })));
      toast.success("تم حفظ النجارين بنجاح.");
      setCarpentersDialogOpen(false);
      if (hasSearched) {
        await handleSearchClick();
      }
    } catch (error) {
      console.error("Error saving carpenters:", error);
      toast.error("تعذر حفظ النجارين.");
    }
  };

  const handleDeleteDriver = async (index, driver) => {
    if (!confirm("هل أنت متأكد أنك تريد حذف هذا السائق نهائيًا؟")) {
      return;
    }

    if (!driver.ID) {
      setDriverDrafts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
      return;
    }

    try {
      const response = await axios.delete(`/api/delivery/update-drivers?id=${driver.ID}`);
      const nextDrivers = Array.isArray(response.data?.items) ? response.data.items : [];
      setDrivers(nextDrivers);
      setDriverDrafts(nextDrivers.map((item) => ({ ...item })));
      toast.success("تم حذف السائق.");
      if (hasSearched) {
        await handleSearchClick();
      }
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("تعذر حذف السائق.");
    }
  };

  const handleDeleteCarpenter = async (index, carpenter) => {
    if (!confirm("هل أنت متأكد أنك تريد حذف هذا النجار نهائيًا؟")) {
      return;
    }

    if (!carpenter.ID) {
      setCarpenterDrafts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
      return;
    }

    try {
      const response = await axios.delete(`/api/delivery/update-carpenters?id=${carpenter.ID}`);
      const nextCarpenters = Array.isArray(response.data?.items) ? response.data.items : [];
      setCarpenters(nextCarpenters);
      setCarpenterDrafts(nextCarpenters.map((item) => ({ ...item })));
      toast.success("تم حذف النجار.");
      if (hasSearched) {
        await handleSearchClick();
      }
    } catch (error) {
      console.error("Error deleting carpenter:", error);
      toast.error("تعذر حذف النجار.");
    }
  };

  return (
    <AppShell
      A="التجهيز"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {paymentDialogOpen && selectedInvoice ? (
        <PaymentForm
          open={paymentDialogOpen}
          onClose={() => {
            setPaymentDialogOpen(false);
            handleSearchClick();
          }}
          inv={selectedInvoice}
          onSave={() => {
            setSelectedInvoice(null);
            setPaymentDialogOpen(false);
          }}
        />
      ) : null}

      {viewDialogOpen && selectedViewInvoice ? (
        <ViewForm
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            handleSearchClick();
          }}
          inv={selectedViewInvoice}
        />
      ) : null}

      {driversDialogOpen ? (
        <PeopleManagerDialog
          open={driversDialogOpen}
          title="إدارة السائقين"
          itemLabel="سائق"
          addLabel="إضافة سائق جديد"
          items={driverDrafts}
          onItemChange={(index, value) => {
            setDriverDrafts((prev) =>
              prev.map((item, currentIndex) =>
                currentIndex === index ? { ...item, Name: value } : item,
              ),
            );
          }}
          onDeleteItem={handleDeleteDriver}
          onAddItem={() => setDriverDrafts((prev) => [...prev, { ID: null, Name: "" }])}
          onClose={() => setDriversDialogOpen(false)}
          onSave={saveDrivers}
        />
      ) : null}

      {carpentersDialogOpen ? (
        <PeopleManagerDialog
          open={carpentersDialogOpen}
          title="إدارة النجارين"
          itemLabel="نجار"
          addLabel="إضافة نجار جديد"
          items={carpenterDrafts}
          onItemChange={(index, value) => {
            setCarpenterDrafts((prev) =>
              prev.map((item, currentIndex) =>
                currentIndex === index ? { ...item, Name: value } : item,
              ),
            );
          }}
          onDeleteItem={handleDeleteCarpenter}
          onAddItem={() => setCarpenterDrafts((prev) => [...prev, { ID: null, Name: "" }])}
          onClose={() => setCarpentersDialogOpen(false)}
          onSave={saveCarpenters}
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
                    لوحة إدارة التجهيز
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.9,
                      color: "rgba(18, 50, 50, 0.78)",
                    }}
                  >
                    ابحث باسم الزبون أو رقم الهاتف أو بتاريخ التجهيز، ثم حدّث الفريق والحالة
                    والتسديد من نفس الشاشة.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<ConstructionIcon />}
                    onClick={openDriversDialog}
                    sx={actionButtonSx}
                  >
                    إدارة السائقين
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ConstructionIcon />}
                    onClick={openCarpentersDialog}
                    sx={actionButtonSx}
                  >
                    إدارة النجارين
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2.25}>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="نتائج البحث الحالية"
                value={data.length}
                helper="عدد الوصولات الظاهرة في الجدول الحالي"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="التجهيزات المكتملة"
                value={readyCount}
                helper="عدد الوصولات التي حالتها جهزت"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SummaryCard
                title="وضع البحث"
                value={isQuerySearch ? "اسم أو هاتف" : "تاريخ"}
                helper={
                  isQuerySearch
                    ? "سيظهر تاريخ التجهيز ويتم تعطيل الطباعة"
                    : "سيتم إخفاء التاريخ لأن البحث حسب يوم محدد"
                }
              />
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: 3, boxShadow: "0 16px 36px rgba(15, 23, 42, 0.05)" }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={2.25}>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "19px",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  فلاتر البحث والإجراءات
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="البحث باسم الزبون أو رقم الهاتف"
                      variant="outlined"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setPage(0);
                      }}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "13px",
                        },
                        "& .MuiInputLabel-root": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "13px",
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonSearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      label="اختر التاريخ"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      sx={{
                        "& .MuiInputBase-input": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "14px",
                        },
                        "& .MuiInputLabel-root": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "12px",
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                      <Button
                        variant="contained"
                        onClick={handleSearchClick}
                        sx={actionButtonSx}
                        disabled={loading}
                        startIcon={<ManageSearchIcon />}
                        fullWidth
                      >
                        بحث
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleGenerateReport}
                        sx={actionButtonSx}
                        disabled={loading || isQuerySearch}
                        startIcon={<LocalPrintshopIcon />}
                        fullWidth
                      >
                        طباعة تقرير التجهيز
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>

                <Alert
                  severity={isQuerySearch ? "info" : "success"}
                  sx={{
                    borderRadius: 3,
                    "& .MuiAlert-message": {
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.8,
                    },
                  }}
                >
                  {isQuerySearch
                    ? "عند البحث باسم الزبون أو رقم الهاتف سيظهر تاريخ التجهيز داخل الجدول، ويتم تعطيل زر طباعة التقرير."
                    : "عند البحث بالتاريخ يتم إخفاء عمود تاريخ التجهيز لأن كل النتائج تخص اليوم المحدد، وتبقى الطباعة متاحة."}
                </Alert>
              </Stack>
            </CardContent>
          </Card>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {hasSearched ? (
            <DeliveryResultsTable
              role={session?.user?.role}
              data={data}
              page={page}
              rowsPerPage={rowsPerPage}
              drivers={drivers}
              carpenters={carpenters}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              onView={handleViewIconClick}
              onPayment={handleOpenPaymentDialog}
              onDelivery={handleDeliveryUpdate}
              onReturn={handleReturnedShipment}
              onDriverChange={handleDriverChange}
              onCarpenterChange={handleCarpenterChange}
              onTimeChange={handleTimeChange}
              showProvideColumn={isQuerySearch}
            />
          ) : null}
        </Stack>
      </Box>
    </AppShell>
  );
}

export default Delivery;
