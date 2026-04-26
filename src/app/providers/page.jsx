"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";

import AppShell from "@/app/components/AppShell";

const ViewDetailsDialog = dynamic(() => import("../components/ViewDetailsDialog"), {
  ssr: false,
});
const ProvidersInvoiceDialog = dynamic(
  () => import("../components/ProvidersInvoiceDialog"),
  { ssr: false },
);
const ProviderArrivalDialog = dynamic(
  () => import("../components/ProviderArrivalDialog"),
  { ssr: false },
);
const ProviderInventoryDialog = dynamic(
  () => import("../components/ProviderInventoryDialog"),
  { ssr: false },
);
const NamedEntityDialog = dynamic(
  () => import("../components/NamedEntityDialog"),
  { ssr: false },
);
const ProvidersResultsTable = dynamic(() => import("./ProvidersResultsTable"), {
  ssr: false,
});

const STATUS_OPTIONS = [
  { value: "all", label: "كل الحالات" },
  { value: "في التصنيع", label: "في التصنيع" },
  { value: "في الطريق", label: "في الطريق" },
  { value: "مستلمة", label: "مستلمة" },
  { value: "مدخلة", label: "مدخلة إلى المخزن" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث أولاً" },
  { value: "oldest", label: "الأقدم أولاً" },
  { value: "item-asc", label: "اسم المادة تصاعدي" },
  { value: "item-desc", label: "اسم المادة تنازلي" },
  { value: "provider-asc", label: "اسم المورد تصاعدي" },
  { value: "provider-desc", label: "اسم المورد تنازلي" },
  { value: "cost-desc", label: "التكلفة الأعلى" },
  { value: "cost-asc", label: "التكلفة الأقل" },
];

const actionButtonSx = {
  borderRadius: "14px",
  backgroundColor: "#386e6e",
  color: "#fff",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  px: 2.4,
  py: 1.1,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "#2d5757",
    boxShadow: "none",
  },
};

const secondaryActionButtonSx = {
  ...actionButtonSx,
  backgroundColor: "transparent",
  color: "#224444",
  border: "1px solid rgba(56, 110, 110, 0.22)",
  "&:hover": {
    backgroundColor: "rgba(56, 110, 110, 0.06)",
    borderColor: "rgba(56, 110, 110, 0.35)",
  },
};

const fieldSx = {
  minWidth: { xs: "100%", md: 220 },
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

const chipSx = {
  borderRadius: "999px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "12px",
};

const collator = new Intl.Collator("ar");

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sortRows(rows, sortOption) {
  const sortedRows = [...rows];

  switch (sortOption) {
    case "oldest":
      sortedRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      break;
    case "item-asc":
      sortedRows.sort((a, b) => collator.compare(a.ItemName || "", b.ItemName || ""));
      break;
    case "item-desc":
      sortedRows.sort((a, b) => collator.compare(b.ItemName || "", a.ItemName || ""));
      break;
    case "provider-asc":
      sortedRows.sort((a, b) => collator.compare(a.providorName || "", b.providorName || ""));
      break;
    case "provider-desc":
      sortedRows.sort((a, b) => collator.compare(b.providorName || "", a.providorName || ""));
      break;
    case "cost-asc":
      sortedRows.sort((a, b) => Number(a.factoryprice ?? 0) - Number(b.factoryprice ?? 0));
      break;
    case "cost-desc":
      sortedRows.sort((a, b) => Number(b.factoryprice ?? 0) - Number(a.factoryprice ?? 0));
      break;
    case "newest":
    default:
      sortedRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      break;
  }

  return sortedRows;
}

function buildSummaryCards(rows) {
  const totalOrders = rows.length;
  const totalPieces = rows.reduce((sum, row) => sum + Number(row.agreedCount ?? 0), 0);
  const inProduction = rows.filter((row) => row.status === "في التصنيع").length;
  const inTransit = rows.filter((row) => row.status === "في الطريق").length;
  const readyOrCompleted = rows.filter((row) =>
    ["مستلمة", "مدخلة"].includes(row.status),
  ).length;

  return [
    { label: "إجمالي الطلبيات", value: totalOrders, tone: "#123232" },
    { label: "إجمالي القطع", value: totalPieces, tone: "#386e6e" },
    { label: "في التصنيع", value: inProduction, tone: "#8d6e63" },
    { label: "في الطريق", value: inTransit, tone: "#1565c0" },
    { label: "جاهزة للاستلام أو الإدخال", value: readyOrCompleted, tone: "#2e7d32" },
  ];
}

export default function ProvidersPage() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProvidorId, setSelectedProvidorId] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [transporterDialogOpen, setTransporterDialogOpen] = useState(false);
  const [arrivalDialogOpen, setArrivalDialogOpen] = useState(false);
  const [selectedArrivalId, setSelectedArrivalId] = useState(null);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [selectedInventoryRow, setSelectedInventoryRow] = useState(null);

  const fetchProviders = async () => {
    try {
      const response = await axios.get("/api/financials/providers/getProviderNames");
      setProviders([{ id: "All", name: "الكل" }, ...response.data]);
    } catch (fetchError) {
      console.error("Error fetching providers:", fetchError);
      toast.error("تعذر جلب قائمة الموردين.");
    }
  };

  const fetchTableData = async (
    providerId = selectedProvider,
    nextStatus = statusFilter,
    showToastOnError = false,
  ) => {
    setLoading(true);
    setError("");

    try {
      const params = { providerId };
      if (nextStatus && nextStatus !== "all") {
        params.status = nextStatus;
      }

      const response = await axios.get("/api/financials/providers/details", { params });
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error("Error fetching provider orders:", fetchError);
      setData([]);
      setError("تعذر جلب بيانات الطلبيات المستوردة حالياً.");

      if (showToastOnError) {
        toast.error("تعذر جلب بيانات الطلبيات المستوردة.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [providersResponse, ordersResponse] = await Promise.all([
          axios.get("/api/financials/providers/getProviderNames"),
          axios.get("/api/financials/providers/details", {
            params: { providerId: "All" },
          }),
        ]);

        if (!ignore) {
          setProviders([{ id: "All", name: "الكل" }, ...providersResponse.data]);
          setData(Array.isArray(ordersResponse.data) ? ordersResponse.data : []);
          setError("");
        }
      } catch (fetchError) {
        console.error("Error loading providers page:", fetchError);

        if (!ignore) {
          setProviders([{ id: "All", name: "الكل" }]);
          setData([]);
          setError("تعذر جلب بيانات الطلبيات المستوردة حالياً.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, sortOption]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    const visibleRows = data.filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        row.ItemName,
        row.providorName,
        row.transportername,
        row.factoryName,
        row.status,
      ].some((value) => normalizeText(value).includes(normalizedSearch));
    });

    return sortRows(visibleRows, sortOption);
  }, [data, searchTerm, sortOption]);

  const summaryCards = useMemo(() => buildSummaryCards(filteredRows), [filteredRows]);

  const activeProviderName =
    providers.find((provider) => String(provider.id) === String(selectedProvider))?.name || "الكل";

  const providerOptions = providers.filter((provider) => provider.id !== "All");

  const refreshTable = async () => {
    await fetchTableData(selectedProvider, statusFilter, true);
  };

  const handleStatusFilterChange = async (nextStatus) => {
    setStatusFilter(nextStatus);
    setPage(0);
    await fetchTableData(selectedProvider, nextStatus, true);
  };

  const handleProviderChange = async (event) => {
    const providerId = event.target.value;
    setSelectedProvider(providerId);
    setPage(0);
    await fetchTableData(providerId, statusFilter, true);
  };

  const handleViewDetails = (id) => {
    setSelectedProvidorId(id);
    setDetailsDialogOpen(true);
  };

  const handleStatusUpdate = async (id) => {
    try {
      await axios.post("/api/financials/providers/updateStatus", { id });
      toast.success("تم تحديث حالة الطلبية بنجاح.");
      await refreshTable();
    } catch (updateError) {
      console.error("Error updating status:", updateError);
      toast.error("تعذر تحديث حالة الطلبية.");
    }
  };

  const hasFilters =
    searchTerm.trim().length > 0 || selectedProvider !== "All" || statusFilter !== "all";

  return (
    <AppShell
      A="إدارة المشتريات المستوردة"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {detailsDialogOpen && selectedProvidorId ? (
        <ViewDetailsDialog
          open={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedProvidorId(null);
          }}
          providorId={selectedProvidorId}
        />
      ) : null}

      {invoiceDialogOpen ? (
        <ProvidersInvoiceDialog
          open={invoiceDialogOpen}
          providers={providerOptions}
          onClose={() => setInvoiceDialogOpen(false)}
          onSuccess={refreshTable}
        />
      ) : null}

      {arrivalDialogOpen && selectedArrivalId ? (
        <ProviderArrivalDialog
          open={arrivalDialogOpen}
          selectedId={selectedArrivalId}
          onClose={() => {
            setArrivalDialogOpen(false);
            setSelectedArrivalId(null);
          }}
          onSuccess={refreshTable}
        />
      ) : null}

      {inventoryDialogOpen && selectedInventoryRow ? (
        <ProviderInventoryDialog
          open={inventoryDialogOpen}
          row={selectedInventoryRow}
          onClose={() => {
            setInventoryDialogOpen(false);
            setSelectedInventoryRow(null);
          }}
          onSuccess={refreshTable}
        />
      ) : null}

      {providerDialogOpen ? (
        <NamedEntityDialog
          open={providerDialogOpen}
          title="إضافة مورد جديد"
          label="اسم المورد"
          endpoint="/api/financials/providers/add"
          requiredMessage="اسم المورد مطلوب."
          successMessage="تمت إضافة المورد بنجاح."
          errorMessage="تعذر إضافة المورد."
          onClose={() => setProviderDialogOpen(false)}
          onSuccess={fetchProviders}
        />
      ) : null}

      {transporterDialogOpen ? (
        <NamedEntityDialog
          open={transporterDialogOpen}
          title="إضافة ناقل جديد"
          label="اسم الناقل"
          endpoint="/api/transporters/add"
          requiredMessage="اسم الناقل مطلوب."
          successMessage="تمت إضافة الناقل بنجاح."
          errorMessage="تعذر إضافة الناقل."
          onClose={() => setTransporterDialogOpen(false)}
          onSuccess={refreshTable}
        />
      ) : null}

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Card
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid rgba(56, 110, 110, 0.10)",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
              background:
                "linear-gradient(135deg, rgba(243,247,247,1) 0%, rgba(232,242,242,1) 100%)",
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
                    إدارة المشتريات المستوردة
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
                    متابعة الموردين والطلبيات والشحن والاستلام والإدخال إلى المخزن من شاشة واحدة
                    متناسقة مع باقي النظام.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={() => setInvoiceDialogOpen(true)}
                    sx={actionButtonSx}
                  >
                    إضافة طلبية جديدة
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setProviderDialogOpen(true)}
                    sx={secondaryActionButtonSx}
                  >
                    إضافة مورد جديد
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setTransporterDialogOpen(true)}
                    sx={secondaryActionButtonSx}
                  >
                    إضافة ناقل جديد
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={refreshTable}
                    sx={secondaryActionButtonSx}
                  >
                    تحديث
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(5, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {summaryCards.map((card) => (
              <Card
                key={card.label}
                sx={{
                  borderRadius: 3,
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
                }}
              >
                <CardContent sx={{ p: 2.25 }}>
                  <Stack spacing={1}>
                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "12px",
                        color: "text.secondary",
                      }}
                    >
                      {card.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: "Alexandria, sans-serif",
                        fontSize: "24px",
                        fontWeight: 600,
                        color: card.tone,
                      }}
                    >
                      {card.value}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.05)",
              border: "1px solid rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", xl: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
                    <TextField
                      label="بحث بالمادة أو المورد أو الناقل"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      variant="filled"
                      sx={{ ...fieldSx, minWidth: { xs: "100%", xl: 320 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControl variant="filled" sx={fieldSx}>
                      <InputLabel>المورد</InputLabel>
                      <Select value={selectedProvider} onChange={handleProviderChange}>
                        {providers.map((provider) => (
                          <MenuItem
                            key={provider.id}
                            value={provider.id}
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            {provider.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl variant="filled" sx={fieldSx}>
                      <InputLabel>الترتيب</InputLabel>
                      <Select value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
                        {SORT_OPTIONS.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{
                              fontFamily: "Alexandria, sans-serif",
                              fontSize: "13px",
                              direction: "rtl",
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`المورد الحالي: ${activeProviderName}`}
                      sx={chipSx}
                      variant="outlined"
                    />
                    <Chip
                      label={`عدد النتائج: ${filteredRows.length}`}
                      sx={chipSx}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = statusFilter === option.value;

                    return (
                      <Chip
                        key={option.value}
                        label={option.label}
                        clickable
                        color={isActive ? "primary" : "default"}
                        onClick={() => handleStatusFilterChange(option.value)}
                        sx={{
                          ...chipSx,
                          px: 0.5,
                          borderColor: isActive ? "primary.main" : "rgba(15, 23, 42, 0.12)",
                        }}
                        variant={isActive ? "filled" : "outlined"}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {error ? (
            <Alert
              severity="error"
              sx={{
                borderRadius: 3,
                fontFamily: "Alexandria, sans-serif",
                alignItems: "center",
              }}
            >
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Card
              sx={{
                borderRadius: 3,
                border: "1px dashed rgba(56, 110, 110, 0.22)",
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ py: 8 }}>
                <Stack spacing={2} alignItems="center">
                  <CircularProgress size={32} />
                  <Typography
                    sx={{
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    جارٍ تحميل بيانات الطلبيات المستوردة...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <ProvidersResultsTable
              rows={filteredRows}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              onViewDetails={handleViewDetails}
              onStatusUpdate={handleStatusUpdate}
              onArrival={(id) => {
                setSelectedArrivalId(id);
                setArrivalDialogOpen(true);
              }}
              onInventory={(row) => {
                setSelectedInventoryRow(row);
                setInventoryDialogOpen(true);
              }}
              emptyMessage={
                hasFilters
                  ? "لا توجد نتائج مطابقة للفلاتر الحالية."
                  : "لا توجد طلبيات مستوردة للعرض حالياً."
              }
            />
          )}
        </Stack>
      </Box>
    </AppShell>
  );
}
