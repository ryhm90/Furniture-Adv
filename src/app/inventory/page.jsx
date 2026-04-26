"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";

import AppShell from "../components/AppShell";

const AppointmentForm = dynamic(() => import("../components/AppointmentForm"), { ssr: false });
const InventoryEditDialog = dynamic(() => import("./InventoryEditDialog"), {
  ssr: false,
});
const InventoryResultsTable = dynamic(() => import("./InventoryResultsTable"), {
  ssr: false,
});

const actionButtonSx = {
  borderRadius: "12px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  textTransform: "none",
  whiteSpace: "nowrap",
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

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return moneyFormatter.format(numericValue);
}

function Inventory() {
  const { data: session } = useSession();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [financialAccounts, setFinancialAccounts] = useState([]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setSelectedRow((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "ExternalPurchase" && value !== "Y" ? { FinancialAccount: "" } : {}),
    }));
  };

  const loadFinancialAccounts = useCallback(async () => {
    try {
      const response = await axios.get("/api/financials/dept/getdebtNames");
      setFinancialAccounts(response.data.map((item) => item.name));
    } catch (error) {
      console.error("Error fetching financial accounts:", error);
      setFinancialAccounts([]);
    }
  }, []);

  const searchData = useCallback(async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setHasSearched(false);
      setData([]);
      toast.warning("يرجى كتابة اسم المادة للبحث.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await axios.get(`/api/entrylist/${encodeURIComponent(trimmedQuery)}`);
      setData(Array.isArray(response.data) ? response.data : []);
      setPage(0);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast.error("تعذر تحميل بيانات المواد.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleViewIconClick = async (row) => {
    await loadFinancialAccounts();
    setSelectedRow({
      ExternalPurchase: "N",
      FinancialAccount: "",
      RoomCostUpdateScope: "entrytable_only",
      ...row,
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedRow(null);
  };

  const handleUpdate = async () => {
    if (selectedRow?.ExternalPurchase === "Y" && !selectedRow?.FinancialAccount) {
      toast.warning("يرجى اختيار الحساب المالي للمادة ذات الشراء الخارجي.");
      return;
    }

    try {
      const response = await axios.put("/api/entrylist/update", selectedRow);
      const updatedSalesRows = Number(response.data?.updatedSalesRows ?? 0);

      handleModalClose();

      if (selectedRow?.RoomCostUpdateScope === "sync_selltable") {
        toast.success(
          `تم تحديث المادة ومزامنة تكلفة ${formatMoney(updatedSalesRows)} سجل بيع سابق.`,
        );
      } else {
        toast.success("تم تحديث بيانات المادة بنجاح.");
      }

      if (hasSearched && searchQuery.trim()) {
        await searchData();
      }
    } catch (error) {
      console.error("Error updating data:", error);
      toast.error("تعذر تحديث المادة.");
    }
  };

  const handleSearchClick = async () => {
    setData([]);
    await searchData();
  };

  const handleRefreshPage = async () => {
    if (searchQuery.trim()) {
      await searchData();
    }
  };

  const handleOpenAddDialog = async () => {
    await loadFinancialAccounts();
    setFormOpen(true);
  };

  const handleAddSuccess = async () => {
    if (hasSearched && searchQuery.trim()) {
      await searchData();
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleGenerateReportAll = async () => {
    try {
      const response = await fetch("/api/inventory/reportAll");

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const resultAll = await response.json();

      if (!resultAll || resultAll.length === 0) {
        toast.warn("لا توجد مواد متاحة للطباعة.");
        return;
      }

      const { generateReportinvAll } = await import("@/utils/generateReportinvAll");
      generateReportinvAll(resultAll);
    } catch (error) {
      console.error("Error fetching items data:", error);
      toast.error("تعذر تحميل بيانات التقرير المخزني.");
    }
  };

  const availableUnits = useMemo(
    () => data.reduce((sum, item) => sum + Number(item.RoomCounts ?? 0), 0),
    [data],
  );

  const damagedUnits = useMemo(
    () => data.reduce((sum, item) => sum + Number(item.FlowCount ?? 0), 0),
    [data],
  );

  const inventoryValue = useMemo(
    () => data.reduce((sum, item) => sum + Number(item.RoomCost ?? 0) * Number(item.RoomCounts ?? 0), 0),
    [data],
  );

  const externalPurchaseItems = useMemo(
    () => data.filter((item) => item.ExternalPurchase === "Y").length,
    [data],
  );

  const searchStatusLabel = useMemo(() => {
    if (!hasSearched) {
      return "ابدأ ببحث جديد لعرض المواد المخزنية";
    }

    return `بحث باسم المادة: ${searchQuery.trim()}`;
  }, [hasSearched, searchQuery]);

  return (
    <AppShell
      A="إدارة المخزون"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {formOpen ? (
        <AppointmentForm
          open={formOpen}
          handleClose={() => setFormOpen(false)}
          financialAccounts={financialAccounts}
          onSuccess={handleAddSuccess}
        />
      ) : null}

      {selectedRow && modalOpen ? (
        <InventoryEditDialog
          open={modalOpen}
          row={selectedRow}
          financialAccounts={financialAccounts}
          onClose={handleModalClose}
          onChange={handleChange}
          onSubmit={handleUpdate}
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
                  لوحة إدارة المخزون
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
                  إدارة المواد المخزنية، إضافة الأصناف الجديدة، تعديل تكلفة الجملة، ومزامنة
                  تكلفة المبيعات السابقة عند الحاجة من واجهة موحدة.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleOpenAddDialog}
                  sx={primaryActionSx}
                >
                  إضافة مادة جديدة
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handleGenerateReportAll}
                  sx={secondaryActionSx}
                >
                  طباعة تقرير مخزني
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshPage}
                  sx={secondaryActionSx}
                  disabled={loading || !searchQuery.trim()}
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
              title="نتائج البحث"
              value={data.length.toLocaleString("en-US")}
              helper={searchStatusLabel}
              icon={<Inventory2OutlinedIcon />}
              color="#386e6e"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="الوحدات المتاحة"
              value={availableUnits.toLocaleString("en-US")}
              helper="إجمالي الكمية المتاحة ضمن المواد الظاهرة"
              icon={<CategoryOutlinedIcon />}
              color="#1565c0"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="قيمة المخزون"
              value={`${formatMoney(inventoryValue)} د.ع`}
              helper="إجمالي تكلفة الجملة الحالية للمواد الظاهرة"
              icon={<PaymentsOutlinedIcon />}
              color="#7b1fa2"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="مواد شراء خارجي"
              value={externalPurchaseItems.toLocaleString("en-US")}
              helper={`عدد المواد المرتبطة بحسابات مالية. المتضرر الحالي: ${damagedUnits.toLocaleString(
                "en-US",
              )}`}
              icon={<SyncAltOutlinedIcon />}
              color="#f57c00"
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
                    ابحث باسم المادة ثم افتح حوار التعديل لتحديد ما إذا كان تعديل تكلفة الجملة
                    يطبّق على المخزن فقط أو أيضاً على المبيعات السابقة.
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} md={9}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="بحث باسم المادة"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
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
                <Grid item xs={12} md={3}>
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
                      disabled={loading || !searchQuery.trim()}
                    >
                      تحديث
                    </Button>
                  </Stack>
                </Grid>
              </Grid>

              <Alert
                severity={hasSearched ? "success" : "info"}
                sx={{
                  borderRadius: 3,
                  "& .MuiAlert-message": {
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                  },
                }}
              >
                {hasSearched
                  ? `الفلاتر الحالية: ${searchStatusLabel}`
                  : "يمكنك أيضاً عند إضافة مادة جديدة اختيار إدخال تكلفة الجملة للمفرد مع العدد فقط، وسيحسب النظام إجمالي التكلفة تلقائياً."}
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
                    جارٍ تحميل نتائج المخزون...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {!loading && !hasSearched ? (
            <Card sx={summaryCardSx}>
              <CardContent sx={{ py: { xs: 6, md: 8 } }}>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Inventory2OutlinedIcon
                    sx={{ fontSize: 42, color: "rgba(56,110,110,0.7)" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#123232",
                    }}
                  >
                    نتائج المواد المخزنية ستظهر هنا
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
                    ابدأ ببحث باسم المادة لعرض الكميات، تكلفة الجملة، الشراء الخارجي، وتنفيذ
                    تعديلات التكلفة على المخزن أو على المبيعات السابقة.
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

                  <InventoryResultsTable
                    data={data}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    role={session?.user?.role}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    onView={handleViewIconClick}
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

export default Inventory;
