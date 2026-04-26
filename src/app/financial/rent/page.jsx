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
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";

import axios from "axios";

import AppShell from "@/app/components/AppShell";
import EmptyTableRow from "@/app/components/EmptyTableRow";
import TablePaginationActionsRtl from "@/app/components/TablePaginationActionsRtl";

const RentFormDialog = dynamic(() => import("../../components/RentFormDialog"), {
  ssr: false,
});

const summaryCardSx = {
  height: "100%",
  borderRadius: 3,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  border: "1px solid rgba(15, 23, 42, 0.06)",
};

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

const secondaryButtonSx = {
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

const headerCellSx = {
  backgroundColor: "#123232",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 500,
  fontSize: "13px",
  borderBottom: "none",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  color: "#0f172a",
};

const currentMonth = new Date().toLocaleDateString("en-CA").slice(0, 7);

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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatMonthLabel(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(`${value}-01`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "long",
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("ar-IQ");
}

function getRentLabel(details) {
  if (details === "Gallery Rent") {
    return "إيجار المعرض";
  }

  if (details === "Warehouse Rent") {
    return "إيجار المخزن";
  }

  return details || "-";
}

export default function RentManagementPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState("");
  const [rentDetails, setRentDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchRentDetails = useCallback(async (month) => {
    if (!month) {
      setRentDetails([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get("/api/rent-details", {
        params: { month },
      });
      setRentDetails(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error("Error fetching rent data:", fetchError);
      setRentDetails([]);
      setError("تعذر تحميل بيانات الإيجار للشهر المحدد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentDetails(selectedMonth);
  }, [fetchRentDetails, selectedMonth]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedMonth]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return rentDetails;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return rentDetails.filter((row) =>
      [row.details, getRentLabel(row.details)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [rentDetails, searchQuery]);

  const totalAmountSpent = rentDetails.reduce(
    (sum, item) => sum + Number(item.amountSpent ?? 0),
    0,
  );
  const galleryRentTotal = rentDetails
    .filter((item) => item.details === "Gallery Rent")
    .reduce((sum, item) => sum + Number(item.amountSpent ?? 0), 0);
  const warehouseRentTotal = rentDetails
    .filter((item) => item.details === "Warehouse Rent")
    .reduce((sum, item) => sum + Number(item.amountSpent ?? 0), 0);

  return (
    <AppShell
      A="إدارة الإيجارات"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {openDialog ? (
        <RentFormDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            fetchRentDetails(selectedMonth);
          }}
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
                    لوحة إدارة الإيجارات
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      maxWidth: 860,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      lineHeight: 1.9,
                      color: "rgba(18, 50, 50, 0.78)",
                    }}
                  >
                    متابعة مصروفات الإيجار الشهرية للمعرض والمخزن، مع عرض إجماليات الشهر
                    المحدد وإدخال دفعات إيجار جديدة من نفس الصفحة.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                  <Button variant="contained" onClick={() => setOpenDialog(true)} sx={actionButtonSx}>
                    تسجيل دفعة إيجار
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => fetchRentDetails(selectedMonth)}
                    sx={secondaryButtonSx}
                    disabled={loading}
                  >
                    تحديث البيانات
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2.25}>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="الشهر المحدد"
                value={formatMonthLabel(selectedMonth)}
                helper="الفترة المعتمدة لعرض الإيجارات"
                icon={<HomeWorkOutlinedIcon />}
                color="#386e6e"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="إجمالي الإيجارات"
                value={formatCurrency(totalAmountSpent)}
                helper={`عدد البنود: ${rentDetails.length.toLocaleString("en-US")}`}
                icon={<StoreOutlinedIcon />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="إيجار المعرض"
                value={formatCurrency(galleryRentTotal)}
                helper="إجمالي ما صُرف للمعرض في هذا الشهر"
                icon={<HomeWorkOutlinedIcon />}
                color="#ef6c00"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <SummaryCard
                title="إيجار المخزن"
                value={formatCurrency(warehouseRentTotal)}
                helper="إجمالي ما صُرف للمخزن في هذا الشهر"
                icon={<WarehouseOutlinedIcon />}
                color="#7b1fa2"
              />
            </Grid>
          </Grid>

          <Card sx={summaryCardSx}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
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
                    فلترة الإيجارات
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    غيّر الشهر لإظهار مصروفات الإيجار الخاصة به، واستخدم البحث لتضييق عرض
                    الجدول حسب نوع الإيجار.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                  <TextField
                    type="month"
                    label="الشهر"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                    variant="filled"
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
                    label="بحث داخل بنود الإيجار"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    variant="filled"
                    sx={{
                      minWidth: { xs: "100%", md: 320 },
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
                يتم احتساب إجماليات الصفحة من كامل بيانات الشهر المحدد، بينما يؤثر البحث على
                الجدول فقط لسهولة الاستعراض.
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
                    جارٍ تحميل بيانات الإيجار...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Paper
              sx={{
                overflow: "hidden",
                borderRadius: 3,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
              }}
            >
              <TableContainer sx={{ maxHeight: 520, overflowX: "auto" }}>
                <Table stickyHeader aria-label="rent table">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={headerCellSx}>
                        تاريخ الصرف
                      </TableCell>
                      <TableCell align="center" sx={headerCellSx}>
                        البند
                      </TableCell>
                      <TableCell align="center" sx={headerCellSx}>
                        عدد الحركات
                      </TableCell>
                      <TableCell align="center" sx={headerCellSx}>
                        المبلغ المصروف
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.length > 0 ? (
                      filteredRows
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row) => (
                          <TableRow
                            key={`${row.details}-${row.entryDate}`}
                            hover
                            sx={{
                              "&:nth-of-type(even)": {
                                backgroundColor: "rgba(15, 23, 42, 0.02)",
                              },
                            }}
                          >
                            <TableCell align="center" sx={bodyCellSx}>
                              {formatDate(row.entryDate)}
                            </TableCell>
                            <TableCell align="center" sx={bodyCellSx}>
                              {getRentLabel(row.details)}
                            </TableCell>
                            <TableCell align="center" sx={bodyCellSx}>
                              {Number(row.entriesCount ?? 0).toLocaleString("en-US")}
                            </TableCell>
                            <TableCell align="center" sx={bodyCellSx}>
                              {formatCurrency(row.amountSpent)}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <EmptyTableRow
                        colSpan={4}
                        message={
                          searchQuery.trim()
                            ? "لا توجد بنود إيجار مطابقة للبحث."
                            : "لا توجد بيانات إيجار للشهر المحدد."
                        }
                      />
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 100]}
                component="div"
                count={filteredRows.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(Number(event.target.value));
                  setPage(0);
                }}
                ActionsComponent={TablePaginationActionsRtl}
                labelRowsPerPage="عدد الصفوف لكل صفحة"
                sx={{
                  "& .MuiTablePagination-toolbar, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
                    {
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                    },
                }}
              />
            </Paper>
          )}
        </Stack>
      </Box>
    </AppShell>
  );
}
