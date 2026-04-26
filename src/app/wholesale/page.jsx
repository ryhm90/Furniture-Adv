"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Groups2Icon from "@mui/icons-material/Groups2";
import InsightsIcon from "@mui/icons-material/Insights";
import LinkIcon from "@mui/icons-material/Link";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import PrintIcon from "@mui/icons-material/Print";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
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
import { toast } from "react-toastify";

import AppShell from "../components/AppShell";

const WSForm = dynamic(() => import("../components/WSForm"), { ssr: false });
const WSFormMulti = dynamic(() => import("../components/WSFormAll"), { ssr: false });
const WholesaleCustomersTable = dynamic(() => import("./WholesaleCustomersTable"), {
  ssr: false,
});
const WholesaleCreateCustomerDialog = dynamic(
  () => import("./WholesaleCreateCustomerDialog"),
  { ssr: false },
);
const WholesaleSalesDialog = dynamic(() => import("./WholesaleSalesDialog"), {
  ssr: false,
});
const WholesalePaymentDialog = dynamic(() => import("./WholesalePaymentDialog"), {
  ssr: false,
});
const WholesaleCustomerPricesDialog = dynamic(
  () => import("./WholesaleCustomerPricesDialog"),
  { ssr: false },
);

const actionButtonSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
  borderRadius: "12px",
  px: 2,
  py: 1.1,
  whiteSpace: "nowrap",
};

const primaryActionSx = {
  ...actionButtonSx,
  backgroundColor: "#386e6e",
  color: "white",
  "&:hover": { backgroundColor: "#2e5a5a" },
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

const getTodayDate = () => new Date().toLocaleDateString("en-CA");

function Wholesale() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formAllOpen, setFormAllOpen] = useState(false);

  const [sellMoneyData, setSellMoneyData] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editSum, setEditSum] = useState({});
  const [currentAffiliate, setCurrentAffiliate] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    affiliateID: "",
    MPU: "",
    affiliate: "",
    paymentDate: getTodayDate(),
  });
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceCustomer, setPriceCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newRecord, setNewRecord] = useState({
    Clname: "",
    affiliate: "",
    TiD: "Tier1",
  });
  const [selectedRecord, setSelectedRecord] = useState({
    Clname: "",
    affiliate: "",
    TiD: "",
    Id: "",
  });

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    return data.filter((customer) =>
      [customer.Clname, customer.affiliate, customer.username, customer.TiD]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [data, searchQuery]);

  const totalBalance = useMemo(
    () =>
      data.reduce((sum, customer) => sum + Number(customer.totalMPU ?? 0), 0).toLocaleString(
        "en-US",
      ),
    [data],
  );

  const publicLinksCount = useMemo(
    () => data.filter((customer) => Boolean(customer.username)).length,
    [data],
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingCustomers(true);

    try {
      const response = await axios.get("/api/affiliate");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("تعذر تحميل بيانات الزبائن.");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleAddRecord = async () => {
    try {
      await axios.post("/api/affiliate", newRecord);
      toast.success("تمت إضافة الزبون بنجاح.");
      setAddDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding record:", error);
      toast.error("تعذر إضافة الزبون.");
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleOpenWSFormAll = () => {
    setFormAllOpen(true);
  };

  const handleOpenWSForm = (record) => {
    setSelectedRecord(record);
    setFormOpen(true);
  };

  const buildPublicWholesaleLink = (username) =>
    new URL(`/ws/${encodeURIComponent(username)}`, window.location.origin).toString();

  const handleCopyPublicLink = async (record) => {
    if (!record?.username) {
      toast.warning("لا يوجد رمز عام صالح لهذا الزبون.");
      return;
    }

    try {
      await navigator.clipboard.writeText(buildPublicWholesaleLink(record.username));
      toast.success("تم نسخ الرابط العام للزبون.");
    } catch (error) {
      console.error("Error copying public wholesale link:", error);
      toast.error("تعذر نسخ الرابط.");
    }
  };

  const handleOpenPublicLink = (record) => {
    if (!record?.username) {
      toast.warning("لا يوجد رمز عام صالح لهذا الزبون.");
      return;
    }

    window.open(buildPublicWholesaleLink(record.username), "_blank", "noopener,noreferrer");
  };

  const fetchSellMoneyData = async (affiliate) => {
    try {
      const response = await axios.get(`/api/sellmoney-ws/de?ClName=${affiliate}`);
      setSellMoneyData(response.data);
      setCurrentAffiliate(affiliate);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching sellmoney data:", error);
      toast.error("تعذر تحميل كشف الزبون.");
    }
  };

  const handleUpdateSum = async (id) => {
    try {
      const updatedSum = editSum[id];
      if (updatedSum !== undefined) {
        await axios.put("/api/sellmoney-ws/update", { InvoNum: id, Sum: updatedSum });
        toast.success("تم تحديث المبلغ.");
        fetchSellMoneyData(currentAffiliate);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating Sum:", error);
      toast.error("تعذر تحديث المبلغ.");
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData.MPU || Number.isNaN(Number.parseFloat(paymentData.MPU))) {
      toast.error("أدخل مبلغًا صحيحًا.");
      return;
    }

    if (!paymentData.paymentDate) {
      toast.error("يرجى تحديد تاريخ التسديد.");
      return;
    }

    try {
      await axios.post("/api/sellmoney-ws/affiliatePU", paymentData, { cache: "no-store" });
      toast.success("تم تسجيل التعزيز بنجاح.");
      setPaymentDialogOpen(false);
      fetchData();
    } catch (_error) {
      setPaymentDialogOpen(false);
      toast.warning("لا توجد فواتير غير مدفوعة لهذا الزبون.");
      fetchData();
    }
  };

  const handleGenerateReport = async (affiliate) => {
    if (!affiliate || !affiliate.affiliate) {
      toast.warn("يرجى اختيار زبون صالح.");
      return;
    }

    try {
      const response = await fetch(
        `/api/sellmoney-ws/report?affiliate=${encodeURIComponent(affiliate.affiliate)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result = await response.json();

      if (!result || result.length === 0) {
        toast.warn("لا توجد بيانات لهذا الزبون.");
        return;
      }

      const { generateReportWs } = await import("@/utils/generateReportWs");
      generateReportWs(result, affiliate.affiliate);
      toast.success("تم تنزيل التقرير.");
    } catch (error) {
      console.error("Error fetching sellmoney data:", error);
      toast.error("تعذر تحميل التقرير.");
    }
  };

  const handleGenerateReportAll = async () => {
    try {
      const response = await fetch("/api/sellmoney-ws/reportAll", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const resultAll = await response.json();

      if (!resultAll || resultAll.length === 0) {
        toast.warn("لا توجد بيانات متاحة للطباعة.");
        return;
      }

      const { generateReportWsAll } = await import("@/utils/generateReportWsAll");
      generateReportWsAll(resultAll);
    } catch (error) {
      console.error("Error fetching sellmoney data:", error);
      toast.error("تعذر تحميل تقرير الزبائن.");
    }
  };

  return (
    <AppShell A="إدارة مبيعات الجملة">
      {formOpen ? (
        <WSForm
          open={formOpen}
          handleClose={() => setFormOpen(false)}
          Clname={selectedRecord.Clname}
          affiliate={selectedRecord.affiliate}
          Ida={selectedRecord.Id}
          TiD={selectedRecord.TiD}
        />
      ) : null}

      {formAllOpen ? (
        <WSFormMulti open={formAllOpen} handleClose={() => setFormAllOpen(false)} />
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
                  لوحة عملاء الجملة
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    maxWidth: 760,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.9,
                    color: "rgba(18, 50, 50, 0.78)",
                  }}
                >
                  إدارة العملاء، التسعير الخاص، المبيعات اليومية، الروابط العامة، والتقارير
                  من واجهة واحدة موحدة.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={() => setAddDialogOpen(true)}
                  sx={primaryActionSx}
                >
                  إضافة زبون جديد
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PointOfSaleIcon />}
                  onClick={handleOpenWSFormAll}
                  sx={primaryActionSx}
                >
                  إدخال مبيعات اليوم
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handleGenerateReportAll}
                  sx={secondaryActionSx}
                >
                  طباعة تقرير الزبائن
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchData}
                  sx={secondaryActionSx}
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
              title="إجمالي الزبائن"
              value={data.length.toLocaleString("en-US")}
              helper="جميع صفحات الجملة المسجلة في النظام"
              icon={<Groups2Icon />}
              color="#386e6e"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="النتائج الحالية"
              value={filteredData.length.toLocaleString("en-US")}
              helper="عدد الزبائن المطابقين للبحث الحالي"
              icon={<SearchIcon />}
              color="#1565c0"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="إجمالي الرصيد"
              value={totalBalance}
              helper="مجموع حركة حسابات عملاء الجملة"
              icon={<InsightsIcon />}
              color="#7b1fa2"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="الروابط العامة"
              value={publicLinksCount.toLocaleString("en-US")}
              helper="عدد العملاء الذين يملكون رابط متابعة خاص"
              icon={<LinkIcon />}
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
                    قاعدة بيانات العملاء
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontFamily: "Alexandria, sans-serif",
                      fontSize: "13px",
                      color: "text.secondary",
                    }}
                  >
                    يمكنك البحث باسم الزبون أو الصفحة أو الرمز العام، ثم تنفيذ الإجراءات من
                    نفس الجدول.
                  </Typography>
                </Box>

                <TextField
                  variant="outlined"
                  label="بحث باسم الزبون أو الصفحة أو الرمز"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(0);
                  }}
                  sx={{
                    minWidth: { xs: "100%", md: 380 },
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
              </Stack>

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
                الأيقونات داخل الجدول تتضمن: كشف الحساب، التعزيز، إضافة بيع، التسعير الخاص،
                نسخ الرابط العام، فتح الصفحة العامة، وطباعة تقرير العميل.
              </Alert>

              {loadingCustomers ? (
                <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
                  <CircularProgress />
                </Box>
              ) : (
                <WholesaleCustomersTable
                  data={filteredData}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  onView={(row) => fetchSellMoneyData(row.affiliate)}
                  onPayment={(row) => {
                    setPaymentData({
                      affiliateID: row.Id,
                      MPU: "",
                      affiliate: row.affiliate,
                      paymentDate: getTodayDate(),
                    });
                    setPaymentDialogOpen(true);
                  }}
                  onAddSale={(row) =>
                    handleOpenWSForm({
                      Clname: row.Clname,
                      affiliate: row.affiliate,
                      TiD: row.TiD,
                      Id: row.Id,
                    })
                  }
                  onManagePrices={(row) => {
                    setPriceCustomer(row);
                    setPriceDialogOpen(true);
                  }}
                  onCopyPublicLink={handleCopyPublicLink}
                  onOpenPublicPage={handleOpenPublicLink}
                  onPrint={(row) => handleGenerateReport({ affiliate: row.affiliate })}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {addDialogOpen ? (
        <WholesaleCreateCustomerDialog
          open={addDialogOpen}
          value={newRecord}
          onChange={setNewRecord}
          onClose={() => {
            setAddDialogOpen(false);
            fetchData();
          }}
          onSave={handleAddRecord}
        />
      ) : null}

      {viewDialogOpen ? (
        <WholesaleSalesDialog
          open={viewDialogOpen}
          data={sellMoneyData}
          editSum={editSum}
          onEditChange={(invoiceNumber, rawValue) => {
            const sanitizedValue = rawValue.replace(/,/g, "");
            if (!Number.isNaN(Number(sanitizedValue))) {
              setEditSum({ ...editSum, [invoiceNumber]: sanitizedValue });
            }
          }}
          onUpdate={handleUpdateSum}
          onClose={() => {
            setViewDialogOpen(false);
            fetchData();
          }}
        />
      ) : null}

      {paymentDialogOpen ? (
        <WholesalePaymentDialog
          open={paymentDialogOpen}
          value={paymentData.MPU}
          paymentDate={paymentData.paymentDate}
          onChange={(rawValue) => {
            const sanitizedValue = rawValue.replace(/,/g, "");
            if (!Number.isNaN(Number(sanitizedValue))) {
              setPaymentData({ ...paymentData, MPU: sanitizedValue });
            }
          }}
          onDateChange={(nextDate) => {
            setPaymentData({ ...paymentData, paymentDate: nextDate });
          }}
          onClose={() => setPaymentDialogOpen(false)}
          onSubmit={handlePaymentSubmit}
        />
      ) : null}

      {priceDialogOpen && priceCustomer ? (
        <WholesaleCustomerPricesDialog
          open={priceDialogOpen}
          customer={priceCustomer}
          onClose={() => {
            setPriceDialogOpen(false);
            setPriceCustomer(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}

export default Wholesale;
