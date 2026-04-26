"use client";

import AddCardIcon from "@mui/icons-material/AddCard";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

import AppShell from "@/app/components/AppShell";

const DeptCreateDialog = dynamic(() => import("./DeptCreateDialog"), { ssr: false });
const DeptTransferDialog = dynamic(() => import("./DeptTransferDialog"), { ssr: false });
const DeptHistoryDialog = dynamic(() => import("./DeptHistoryDialog"), { ssr: false });
const DeptWalletsTable = dynamic(() => import("./DeptWalletsTable"), { ssr: false });

const ACTION_BUTTON_SX = {
  borderRadius: "10px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
};

const FIELD_SX = {
  "& .MuiInputBase-input": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
  "& .MuiInputLabel-root": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
};

const SORT_OPTIONS = [
  { value: "name-asc", label: "الاسم تصاعدي" },
  { value: "name-desc", label: "الاسم تنازلي" },
  { value: "amount-desc", label: "الأعلى رصيداً" },
  { value: "amount-asc", label: "الأقل رصيداً" },
];

const BALANCE_FILTERS = [
  { value: "all", label: "كل المحافظ" },
  { value: "positive", label: "الأرصدة الدائنة" },
  { value: "negative", label: "الأرصدة المدينة" },
  { value: "zero", label: "الأرصدة المتوازنة" },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
  }).format(Number(amount ?? 0));

const stripCommas = (value) => Number.parseFloat(value?.toString().replace(/,/g, "")) || 0;

const formatAmountInput = (value) =>
  value.replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function sortWallets(wallets, sortOption) {
  const sortedWallets = [...wallets];

  switch (sortOption) {
    case "name-asc":
      sortedWallets.sort((a, b) => a.Name.localeCompare(b.Name));
      break;
    case "name-desc":
      sortedWallets.sort((a, b) => b.Name.localeCompare(a.Name));
      break;
    case "amount-asc":
      sortedWallets.sort((a, b) => Number(a.Amount) - Number(b.Amount));
      break;
    case "amount-desc":
    default:
      sortedWallets.sort((a, b) => Number(b.Amount) - Number(a.Amount));
      break;
  }

  return sortedWallets;
}

function downloadWalletsCsv(wallets) {
  const rows = [
    ["المحفظة", "الرصيد", "الحالة"],
    ...wallets.map((wallet) => [
      wallet.Name,
      Number(wallet.Amount).toLocaleString("en-US"),
      Number(wallet.Amount) > 0 ? "دائن" : Number(wallet.Amount) < 0 ? "مدين" : "متوازن",
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "financial-wallets-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dept() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [safeboxData, setSafeboxData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyExporting, setHistoryExporting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("amount-desc");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [deptname, setdeptname] = useState([]);
  const [formValues, setFormValues] = useState({ name: "", amount: "", details: "" });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferSource, setTransferSource] = useState("");
  const [returnDetails, setReturnDetails] = useState({ name: "", amount: "", details: "" });
  const [returnToSafebox, setReturnToSafebox] = useState(false);
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [isTransferringDept, setIsTransferringDept] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchDeptData = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/financials/dept");
      setData(response.data.deptData || []);
      setSafeboxData(response.data.safeboxData || []);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error("Error fetching department data:", error);
      toast.error("تعذر جلب بيانات المحافظ المالية.");
    } finally {
      setLoading(false);
    }
  };

  const fetchdeptname = async () => {
    try {
      const response = await axios.get("/api/financials/dept/getdebtNames");
      setdeptname(response.data.map((deptItem) => ({ name: deptItem.name })));
    } catch (error) {
      console.error("Error fetching deptname:", error);
    }
  };

  const refreshPageData = async () => {
    await Promise.all([fetchDeptData(), fetchdeptname()]);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchDeptData(), fetchdeptname()]);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, sortOption, balanceFilter]);

  const totalBalance = data.reduce((sum, row) => sum + Number(row.Amount ?? 0), 0);
  const safeboxBalance = Number(safeboxData?.[0]?.totalMoneyPaid ?? 0);
  const positiveWallets = data.filter((wallet) => Number(wallet.Amount) > 0);
  const negativeWallets = data.filter((wallet) => Number(wallet.Amount) < 0);
  const zeroWallets = data.filter((wallet) => Number(wallet.Amount) === 0);
  const largestWallet = sortWallets(data, "amount-desc")[0] ?? null;

  const filteredWallets = sortWallets(
    data.filter((wallet) => {
      const matchesSearch = wallet.Name.toLowerCase().includes(searchTerm.trim().toLowerCase());

      const amount = Number(wallet.Amount ?? 0);
      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "positive" && amount > 0) ||
        (balanceFilter === "negative" && amount < 0) ||
        (balanceFilter === "zero" && amount === 0);

      return matchesSearch && matchesBalance;
    }),
    sortOption,
  );

  const summaryCards = [
    {
      label: "إجمالي المحافظ",
      value: data.length,
      tone: "default",
      helper: `المعروضة حالياً: ${filteredWallets.length}`,
    },
    {
      label: "صافي الرصيد",
      value: formatCurrency(totalBalance),
      tone: totalBalance >= 0 ? "success" : "error",
      helper: "بعد جمع كل الحركات",
    },
    {
      label: "رصيد الصندوق الكلي",
      value: formatCurrency(safeboxBalance),
      tone: "primary",
      helper: "الرصيد المجمّع للصندوق",
    },
    {
      label: "أعلى محفظة",
      value: largestWallet ? largestWallet.Name : "-",
      tone: "secondary",
      helper: largestWallet ? formatCurrency(largestWallet.Amount) : "لا توجد بيانات",
    },
  ];

  const reportSummaryRows = [
    { label: "عدد المحافظ", value: filteredWallets.length },
    { label: "إجمالي الأرصدة المعروضة", value: formatCurrency(filteredWallets.reduce((sum, wallet) => sum + Number(wallet.Amount ?? 0), 0)) },
    { label: "المحافظ الدائنة", value: positiveWallets.length },
    { label: "المحافظ المدينة", value: negativeWallets.length },
    { label: "المحافظ المتوازنة", value: zeroWallets.length },
    { label: "رصيد الصندوق الكلي", value: formatCurrency(safeboxBalance) },
  ];

  const currentWalletBalance = data.find((wallet) => wallet.Name === selectedWallet)?.Amount ?? 0;
  const currentSortLabel = SORT_OPTIONS.find((option) => option.value === sortOption)?.label ?? "-";
  const currentBalanceFilterLabel =
    BALANCE_FILTERS.find((option) => option.value === balanceFilter)?.label ?? "-";

  const resetCreateForm = () => {
    setFormValues({ name: "", amount: "", details: "" });
  };

  const resetTransferForm = () => {
    setTransferSource("");
    setReturnDetails({ name: "", amount: "", details: "" });
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setFormMode("create");
    setReturnToSafebox(false);
    resetCreateForm();
  };

  const handleCreateNameChange = (name) => {
    setFormValues((prev) => ({ ...prev, name }));
  };

  const handleCreateAmountChange = (amount) => {
    setFormValues((prev) => ({ ...prev, amount: formatAmountInput(amount) }));
  };

  const handleCreateDetailsChange = (details) => {
    setFormValues((prev) => ({ ...prev, details }));
  };

  const handleSubmit = async () => {
    if (isCreatingDept) {
      return;
    }

    setIsCreatingDept(true);

    try {
      const payload = {
        name: formValues.name,
        amount: stripCommas(formValues.amount),
        details: formValues.details,
        state: returnToSafebox,
      };

      const response = await axios.post("/api/financials/dept/adddept", payload);

      if (response.status === 200) {
        toast.success(
          formMode === "enhance"
            ? "تم تعزيز رصيد المحفظة بنجاح."
            : "تم حفظ المحفظة أو تعزيز رصيدها بنجاح.",
        );
        handleClose();
        await refreshPageData();
      }
    } catch (error) {
      toast.error("تعذر حفظ العملية.");
      console.error("Error inserting record:", error);
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleHistoryOpen = async (walletName) => {
    setSelectedWallet(walletName);

    try {
      const response = await axios.get("/api/financials/dept/history", {
        params: { name: walletName },
      });
      setHistoryData(response.data.history || []);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryData([]);
      toast.error("تعذر جلب الحركة التاريخية للمحفظة.");
    }
  };

  const handleHistoryClose = () => {
    setHistoryDialogOpen(false);
    setHistoryData([]);
    setSelectedWallet("");
  };

  const handleEnhanceDialogOpen = (walletName) => {
    setFormMode("enhance");
    setReturnToSafebox(false);
    setFormValues({ name: walletName, amount: "", details: "" });
    setIsFormOpen(true);
  };

  const handleReturnDialogOpen = (name) => {
    setReturnDetails({ name, amount: "", details: "" });
    setTransferSource("");
    setTransferDialogOpen(true);
  };

  const handleReturnDialogClose = () => {
    setTransferDialogOpen(false);
    resetTransferForm();
  };

  const handleTransferAmountChange = (value) => {
    const raw = value.replace(/,/g, "");

    if (raw === "" || !Number.isNaN(Number(raw))) {
      setReturnDetails((prev) => ({
        ...prev,
        amount: raw === "" ? "" : Number(raw).toLocaleString(),
      }));
    }
  };

  const handleReturn = async () => {
    if (isTransferringDept) {
      return;
    }

    setIsTransferringDept(true);

    try {
      await axios.post("/api/financials/dept/return", {
        ...returnDetails,
        source: transferSource,
      });

      setTransferDialogOpen(false);
      toast.success("تم تنفيذ الحركة المالية بنجاح.");
      resetTransferForm();
      await refreshPageData();
    } catch (error) {
      toast.error("تعذر تنفيذ الحركة المالية.");
      console.error("Error Operation Place:", error);
    } finally {
      setIsTransferringDept(false);
    }
  };

  const handleExportPdf = async () => {
    if (filteredWallets.length === 0) {
      toast.warning("لا توجد محافظ مطابقة للفلاتر الحالية.");
      return;
    }

    setExporting(true);

    try {
      const { exportFinancialWalletsPdf } = await import("@/utils/exportFinancialWalletsPdf");
      await exportFinancialWalletsPdf({
        wallets: filteredWallets,
        searchTerm,
        balanceFilterLabel: currentBalanceFilterLabel,
        sortLabel: currentSortLabel,
        summaryRows: reportSummaryRows,
      });
    } catch (error) {
      console.error("Error exporting wallets report:", error);
      toast.error("تعذر تصدير تقرير المحافظ.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportHistoryPdf = async () => {
    if (!selectedWallet || historyData.length === 0) {
      return;
    }

    setHistoryExporting(true);

    try {
      const { exportWalletHistoryPdf } = await import("@/utils/exportFinancialWalletsPdf");
      await exportWalletHistoryPdf({
        walletName: selectedWallet,
        historyRows: historyData,
        currentBalance: currentWalletBalance,
      });
    } catch (error) {
      console.error("Error exporting wallet history:", error);
      toast.error("تعذر تصدير كشف حركة المحفظة.");
    } finally {
      setHistoryExporting(false);
    }
  };

  return (
    <AppShell
      title="إدارة المحافظ المالية"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {isFormOpen ? (
        <DeptCreateDialog
          open={isFormOpen}
          deptname={deptname}
          formValues={formValues}
          mode={formMode}
          returnToSafebox={returnToSafebox}
          onClose={handleClose}
          onNameChange={handleCreateNameChange}
          onAmountChange={handleCreateAmountChange}
          onDetailsChange={handleCreateDetailsChange}
          onToggleReturnToSafebox={setReturnToSafebox}
          onSubmit={handleSubmit}
          isSubmitting={isCreatingDept}
        />
      ) : null}

      {transferDialogOpen ? (
        <DeptTransferDialog
          open={transferDialogOpen}
          deptname={deptname}
          returnDetails={returnDetails}
          sourceName={transferSource}
          onClose={handleReturnDialogClose}
          onSourceChange={setTransferSource}
          onAmountChange={handleTransferAmountChange}
          onDetailsChange={(details) =>
            setReturnDetails((prev) => ({ ...prev, details }))
          }
          onSubmit={handleReturn}
          isSubmitting={isTransferringDept}
        />
      ) : null}

      {historyDialogOpen ? (
        <DeptHistoryDialog
          open={historyDialogOpen}
          selectedWallet={selectedWallet}
          historyData={historyData}
          currentBalance={currentWalletBalance}
          onClose={handleHistoryClose}
          onExportPdf={handleExportHistoryPdf}
          isExporting={historyExporting}
        />
      ) : null}

      <Card sx={{ mb: 3, borderRadius: 4 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  mb: 1,
                }}
              >
                لوحة إدارة المحافظ
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 400,
                  fontSize: "13px",
                  color: "text.secondary",
                }}
              >
                متابعة الأرصدة، تنفيذ التحويلات، واستعراض الحركة التاريخية مع تصدير PDF.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<AddCardIcon />}
                onClick={() => {
                  setFormMode("create");
                  setIsFormOpen(true);
                }}
                sx={{
                  ...ACTION_BUTTON_SX,
                  backgroundColor: "#386e6e",
                  "&:hover": { backgroundColor: "#2e5a5a" },
                }}
              >
                إضافة محفظة
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportPdf}
                disabled={exporting}
                sx={ACTION_BUTTON_SX}
              >
                {exporting ? "جاري التصدير..." : "تقرير PDF"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => downloadWalletsCsv(filteredWallets)}
                disabled={filteredWallets.length === 0}
                sx={ACTION_BUTTON_SX}
              >
                CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refreshPageData}
                disabled={loading}
                sx={ACTION_BUTTON_SX}
              >
                تحديث
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`آخر تحديث: ${
                lastUpdatedAt ? lastUpdatedAt.toLocaleString("en-CA") : "لم يتم بعد"
              }`}
              sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
            />
            <Chip
              label={`الدائنة: ${positiveWallets.length}`}
              color="success"
              sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
            />
            <Chip
              label={`المدينة: ${negativeWallets.length}`}
              color="error"
              sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px" }}
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid item xs={12} sm={6} xl={3} key={card.label}>
            <Card sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    color: "text.secondary",
                    mb: 1,
                  }}
                >
                  {card.label}
                </Typography>
                <Chip
                  label={card.value}
                  color={card.tone}
                  sx={{
                    mb: 1,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "12px",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                    color: "text.secondary",
                  }}
                >
                  {card.helper}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3, borderRadius: 4 }}>
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              variant="filled"
              label="البحث عن محفظة"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              sx={FIELD_SX}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl variant="filled" sx={FIELD_SX}>
              <InputLabel>نوع الرصيد</InputLabel>
              <Select
                value={balanceFilter}
                onChange={(event) => setBalanceFilter(event.target.value)}
              >
                {BALANCE_FILTERS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontWeight: 400,
                      fontSize: "13px",
                      direction: "rtl",
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl variant="filled" sx={FIELD_SX}>
              <InputLabel>الترتيب</InputLabel>
              <Select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontWeight: 400,
                      fontSize: "13px",
                      direction: "rtl",
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {filteredWallets.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            "& .MuiAlert-message": {
              fontFamily: "Alexandria, sans-serif",
              fontSize: "13px",
            },
          }}
        >
          لا توجد محافظ مطابقة للفلاتر الحالية.
        </Alert>
      ) : null}

      <DeptWalletsTable
        data={filteredWallets}
        page={page}
        rowsPerPage={rowsPerPage}
        totalBalance={totalBalance}
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(+event.target.value);
          setPage(0);
        }}
        onEnhance={handleEnhanceDialogOpen}
        onTransfer={handleReturnDialogOpen}
        onHistory={handleHistoryOpen}
      />
    </AppShell>
  );
}
