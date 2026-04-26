"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Alert,
  Box,
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
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";

import AppShell from "@/app/components/AppShell";

const ProviderPaymentDialog = dynamic(
  () => import("@/app/components/ProviderPaymentDialog"),
  { ssr: false },
);
const FinancialProvidersTable = dynamic(
  () => import("./FinancialProvidersTable"),
  { ssr: false },
);

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

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function FinancialProvidersPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const fetchTableData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("/api/financials/providers/detailsf");
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Error fetching provider accounts:", requestError);
      setError("تعذر تحميل حسابات الموردين.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  useEffect(() => {
    setPage(0);
  }, [balanceFilter, searchQuery, typeFilter]);

  const typeOptions = useMemo(
    () => ["All", ...Array.from(new Set(data.map((row) => row.type).filter(Boolean)))],
    [data],
  );

  const filteredRows = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = searchQuery.trim()
        ? [row.Name, row.type]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(searchQuery.trim().toLowerCase()),
            )
        : true;

      const matchesType = typeFilter === "All" ? true : row.type === typeFilter;
      const balance = Number(row.Balance ?? 0);
      const matchesBalance =
        balanceFilter === "all"
          ? true
          : balanceFilter === "debtors"
            ? balance > 0
            : balanceFilter === "creditors"
              ? balance < 0
              : balance === 0;

      return matchesSearch && matchesType && matchesBalance;
    });
  }, [balanceFilter, data, searchQuery, typeFilter]);

  const totalProviders = filteredRows.length;
  const totalOpenBalances = filteredRows.reduce(
    (sum, row) => sum + Math.max(Number(row.Balance ?? 0), 0),
    0,
  );
  const totalPaid = filteredRows.reduce((sum, row) => sum + Number(row.TotalOut ?? 0), 0);
  const debtorsCount = filteredRows.filter((row) => Number(row.Balance ?? 0) > 0).length;

  const handleOpenPaymentDialog = (provider) => {
    setSelectedProvider(provider);
    setIsPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setSelectedProvider(null);
  };

  const handleGenerateReportAll = async (provider) => {
    if (!provider?.Name_ID) {
      toast.warn("معرف المورد مطلوب.");
      return;
    }

    const url = `/api/financials/providers/report?providerId=${provider.Name_ID}&type=${provider.type}`;

    try {
      const response = await axios.get(url);
      const resultAll = response.data;

      if (!resultAll?.length) {
        toast.warn("لا توجد حركات لعرضها في التقرير.");
        return;
      }

      const { generateReportProviders } = await import("@/utils/generateReportProviders");
      generateReportProviders(resultAll);
    } catch (requestError) {
      console.error("Error generating report:", requestError);
      toast.error("تعذر إنشاء التقرير.");
    }
  };

  const handleQuickPrint = (provider) => {
    import("@/utils/generateReportProviders")
      .then(({ generateReportProviders }) => {
        generateReportProviders([
          {
            Name: provider.Name,
            Inn: Number(provider.TotalIn ?? 0),
            Out: Number(provider.TotalOut ?? 0),
            Details: "ملخص الحساب الحالي",
            status: "Summary",
            dateIssued: provider.lastMovementDate || new Date().toLocaleDateString("en-CA"),
          },
        ]);
        toast.success(`تم إنشاء التقرير المختصر للمورد ${provider.Name}.`);
      })
      .catch((requestError) => {
        console.error("Error generating quick report:", requestError);
        toast.error("تعذر إنشاء التقرير المختصر.");
      });
  };

  return (
    <AppShell
      A="حسابات الموردين"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
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
              <Box>
                <Typography
                  sx={{
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: { xs: "24px", md: "30px" },
                    fontWeight: 600,
                    color: "#123232",
                  }}
                >
                  لوحة حسابات الموردين
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                    color: "rgba(18, 50, 50, 0.78)",
                    maxWidth: 860,
                  }}
                >
                  متابعة أرصدة الموردين والناقلين، تسجيل الدفعات، واستعراض تقارير كشف الحساب
                  التفصيلية من نفس اللوحة.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={2.25}>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="عدد الحسابات"
                value={totalProviders.toLocaleString("en-US")}
                helper="حسب الفلاتر الحالية"
                icon={<LocalShippingOutlinedIcon />}
                color="#386e6e"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="إجمالي الرصيد المفتوح"
                value={formatUsd(totalOpenBalances)}
                helper="الرصيد المستحق دفعه للموردين"
                icon={<TrendingUpOutlinedIcon />}
                color="#c62828"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="إجمالي المدفوع"
                value={formatUsd(totalPaid)}
                helper="إجمالي الدفعات المسجلة"
                icon={<PaidOutlinedIcon />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="الحسابات المدينة"
                value={debtorsCount.toLocaleString("en-US")}
                helper="عدد الموردين ذوي الرصيد غير المسدد"
                icon={<SummarizeOutlinedIcon />}
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
                    ابحث باسم المورد أو نوع الخدمة، وفلتر الحسابات حسب النوع أو طبيعة الرصيد.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2}>
                  <TextField
                    label="بحث باسم المورد أو نوع الخدمة"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    variant="filled"
                    sx={{
                      minWidth: { xs: "100%", lg: 320 },
                      "& .MuiInputBase-input": {
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "13px",
                        direction: "rtl",
                      },
                      "& .MuiInputLabel-root": {
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

                  <FormControl variant="filled" sx={{ minWidth: { xs: "100%", lg: 200 } }}>
                    <InputLabel
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    >
                      نوع الخدمة
                    </InputLabel>
                    <Select
                      value={typeFilter}
                      onChange={(event) => setTypeFilter(event.target.value)}
                      label="نوع الخدمة"
                      sx={{
                        "& .MuiSelect-select": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "13px",
                          direction: "rtl",
                        },
                      }}
                    >
                      {typeOptions.map((typeOption) => (
                        <MenuItem
                          key={typeOption}
                          value={typeOption}
                          sx={{
                            fontFamily: "Alexandria, sans-serif",
                            fontWeight: 400,
                            fontSize: "13px",
                            direction: "rtl",
                          }}
                        >
                          {typeOption === "All" ? "الكل" : typeOption}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl variant="filled" sx={{ minWidth: { xs: "100%", lg: 200 } }}>
                    <InputLabel
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontWeight: 400,
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    >
                      حالة الرصيد
                    </InputLabel>
                    <Select
                      value={balanceFilter}
                      onChange={(event) => setBalanceFilter(event.target.value)}
                      label="حالة الرصيد"
                      sx={{
                        "& .MuiSelect-select": {
                          fontFamily: "Alexandria, sans-serif",
                          fontWeight: 400,
                          fontSize: "13px",
                          direction: "rtl",
                        },
                      }}
                    >
                      <MenuItem value="all" sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                        الكل
                      </MenuItem>
                      <MenuItem value="debtors" sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                        مدين
                      </MenuItem>
                      <MenuItem value="creditors" sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                        دائن
                      </MenuItem>
                      <MenuItem value="settled" sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                        متوازن
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
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
                    جارٍ تحميل حسابات الموردين...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 3, boxShadow: "0 16px 36px rgba(15, 23, 42, 0.05)" }}>
              <CardContent sx={{ p: 0 }}>
                <FinancialProvidersTable
                  data={filteredRows}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(_event, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(+event.target.value);
                    setPage(0);
                  }}
                  onPayment={handleOpenPaymentDialog}
                  onReport={handleGenerateReportAll}
                  onQuickPrint={handleQuickPrint}
                />
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      {isPaymentDialogOpen && selectedProvider ? (
        <ProviderPaymentDialog
          open={isPaymentDialogOpen}
          provider={selectedProvider}
          onClose={handleClosePaymentDialog}
          onSuccess={fetchTableData}
        />
      ) : null}
    </AppShell>
  );
}
