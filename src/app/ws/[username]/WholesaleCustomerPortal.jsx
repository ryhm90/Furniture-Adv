"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import EmptyTableRow from "@/app/components/EmptyTableRow";
import { mapWholesaleTransactionType } from "@/utils/mapWholesaleTransactionType";

const headerCellSx = {
  backgroundColor: "#2c2c4d",
  color: "white",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const bodyCellSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IQD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-CA");

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return dateFormatter.format(parsedDate);
}

export default function WholesaleCustomerPortal({ username }) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const loadStatement = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/public/wholesale/${encodeURIComponent(username)}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحميل كشف الحساب.");
      }

      setData(result);
    } catch (loadError) {
      const errorMessage =
        loadError instanceof Error ? loadError.message : "تعذر تحميل كشف الحساب.";
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const totalTransactions = useMemo(() => data?.items?.length ?? 0, [data]);

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ الرابط.");
    } catch {
      toast.error("تعذر نسخ الرابط.");
    }
  };

  const handleDownloadReport = async () => {
    if (!data?.items?.length) {
      toast.warning("لا توجد بيانات لتصدير التقرير.");
      return;
    }

    setDownloading(true);

    try {
      const { generateReportWs } = await import("@/utils/generateReportWs");
      generateReportWs(data.items, data.affiliate.affiliate);
      toast.success("تم تنزيل التقرير.");
    } catch (downloadError) {
      console.error("Error generating public wholesale report:", downloadError);
      toast.error("تعذر إنشاء التقرير.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, md: 8 },
        background:
          "linear-gradient(180deg, rgba(245,247,250,1) 0%, rgba(232,238,243,1) 100%)",
      }}
    >
      <Container maxWidth="lg">
        <Paper
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontWeight: 600,
                  fontSize: { xs: "22px", md: "28px" },
                }}
              >
                كشف حساب الجملة
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  color: "text.secondary",
                  mt: 1,
                }}
              >
                هذه الصفحة عامة برابط خاص، ولا تحتاج إلى تسجيل دخول.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={copyCurrentLink}
                sx={{ fontFamily: "Alexandria, sans-serif" }}
              >
                نسخ الرابط
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadStatement}
                sx={{ fontFamily: "Alexandria, sans-serif" }}
              >
                تحديث
              </Button>
              <Button
                variant="contained"
                startIcon={downloading ? <OpenInNewIcon /> : <DownloadIcon />}
                onClick={handleDownloadReport}
                disabled={downloading || !data?.items?.length}
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  backgroundColor: "#386e6e",
                  "&:hover": { backgroundColor: "#2e5a5a" },
                }}
              >
                {downloading ? "جاري إعداد التقرير..." : "تحميل التقرير PDF"}
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {!loading && error ? (
            <Alert severity="error" sx={{ mb: 3, fontFamily: "Alexandria, sans-serif" }}>
              {error}
            </Alert>
          ) : null}

          {!loading && data ? (
            <>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
                <Card sx={{ flex: 1, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                      اسم الصفحة
                    </Typography>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600, fontSize: "18px", mt: 1 }}>
                      {data.affiliate.affiliate}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: 1, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                      الحساب الحالي
                    </Typography>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600, fontSize: "18px", mt: 1 }}>
                      {currencyFormatter.format(Number(data.affiliate.totalMPU ?? 0))}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ flex: 1, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "12px", color: "text.secondary" }}>
                      عدد الحركات
                    </Typography>
                    <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontWeight: 600, fontSize: "18px", mt: 1 }}>
                      {totalTransactions}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>

              <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: 3 }}>
                <TableContainer sx={{ maxHeight: 520 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={headerCellSx}>رقم الفاتورة</TableCell>
                        <TableCell align="center" sx={headerCellSx}>التاريخ</TableCell>
                        <TableCell align="center" sx={headerCellSx}>المواد</TableCell>
                        <TableCell align="center" sx={headerCellSx}>العدد</TableCell>
                        <TableCell align="center" sx={headerCellSx}>السائق</TableCell>
                        <TableCell align="center" sx={headerCellSx}>العنوان</TableCell>
                        <TableCell align="center" sx={headerCellSx}>التفاصيل</TableCell>
                        <TableCell align="center" sx={headerCellSx}>المبلغ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((item) => (
                        <TableRow key={`${item.Invonum}-${item.Id}`}>
                          <TableCell align="center" sx={bodyCellSx}>{item.Invonum || "-"}</TableCell>
                          <TableCell align="center" sx={bodyCellSx}>{formatDate(item.date)}</TableCell>
                          <TableCell align="center" sx={bodyCellSx}>{item.RoomNames || "-"}</TableCell>
                          <TableCell align="center" sx={bodyCellSx}>{item.countt || 0}</TableCell>
                          <TableCell align="center" sx={bodyCellSx}>{item.Driver || "-"}</TableCell>
                          <TableCell align="center" sx={bodyCellSx}>
                            {[item.Provin, item.Provin2].filter(Boolean).join(" - ") || "-"}
                          </TableCell>
                          <TableCell align="center" sx={bodyCellSx}>
                            {mapWholesaleTransactionType(item.De)}
                          </TableCell>
                          <TableCell align="center" sx={bodyCellSx}>
                            {currencyFormatter.format(Number(item.MPU ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.items.length === 0 ? <EmptyTableRow colSpan={8} /> : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          ) : null}
        </Paper>
      </Container>
    </Box>
  );
}
