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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import SearchIcon from "@mui/icons-material/Search";
import WalletOutlinedIcon from "@mui/icons-material/WalletOutlined";
import axios from "axios";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";
import AppShell from "@/app/components/AppShell";

const PaymentDialog = dynamic(() => import("./PaymentDialog"), {
  ssr: false,
});
const EmployeeCreateDialog = dynamic(() => import("./EmployeeCreateDialog"), {
  ssr: false,
});
const SalaryAdvanceDialog = dynamic(() => import("./SalaryAdvanceDialog"), {
  ssr: false,
});
const PayrollConfirmDialog = dynamic(() => import("./PayrollConfirmDialog"), {
  ssr: false,
});
const EmployeesTable = dynamic(() => import("./EmployeesTable"), {
  ssr: false,
});

const summaryCardSx = {
  height: "100%",
  borderRadius: 3,
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
  border: "1px solid rgba(15, 23, 42, 0.06)",
};

const primaryActionSx = {
  borderRadius: "12px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  px: 2,
  py: 1.1,
  textTransform: "none",
  backgroundColor: "#386e6e",
  color: "white",
  "&:hover": {
    backgroundColor: "#2e5a5a",
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export default function Payroll() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [allData, setAllData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [paymentEmployee, setPaymentEmployee] = useState(null);
  const [advanceEmployee, setAdvanceEmployee] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [isActionSubmitting, runWithActionSubmission] = useSubmissionState();

  const getData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("/api/financials/payroll/employees", {
        cache: "no-store",
      });
      setAllData(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error("Error fetching employees:", fetchError);
      setError("تعذر تحميل بيانات الموظفين.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getData();
  }, [getData]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return allData;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return allData.filter((employee) =>
      [employee.name, employee.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [allData, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const totalEmployees = allData.length;
  const totalSalaries = allData.reduce((sum, employee) => sum + Number(employee.salary ?? 0), 0);
  const totalAdvances = allData.reduce(
    (sum, employee) => sum + Number(employee.salary_advance ?? 0),
    0,
  );
  const totalNetSalaries = allData.reduce(
    (sum, employee) => sum + Number(employee.net_salary_due ?? 0),
    0,
  );

  const handleOpenCreateDialog = () => {
    setEditingEmployee(null);
    setIsEmployeeDialogOpen(true);
  };

  const handleOpenEditDialog = (employee) => {
    setEditingEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleCloseEmployeeDialog = () => {
    setIsEmployeeDialogOpen(false);
    setEditingEmployee(null);
  };

  const handlePayrollAction = async () => {
    if (!actionDialog?.employee?.id) {
      return;
    }

    const { employee, type } = actionDialog;
    const endpointMap = {
      bonus: {
        url: "/api/financials/payroll/employees/bonus",
        method: "POST",
        body: { selectedEmployeeId: employee.id },
        successMessage: "تم تصفية مكافآت الموظف بنجاح.",
      },
      received: {
        url: "/api/financials/payroll/employees/received",
        method: "POST",
        body: { selectedEmployeeId: employee.id },
        successMessage: "تمت تصفية المبالغ المستلمة من الزبائن.",
      },
      delete: {
        url: `/api/financials/payroll/employees/${employee.id}`,
        method: "DELETE",
        body: null,
        successMessage: "تم حذف الموظف بنجاح.",
      },
    };

    const actionConfig = endpointMap[type];
    if (!actionConfig) {
      return;
    }

    await runWithActionSubmission(async () => {
      try {
        const response = await fetch(actionConfig.url, {
          method: actionConfig.method,
          headers: actionConfig.body
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
          body: actionConfig.body ? JSON.stringify(actionConfig.body) : undefined,
        });

        const payload = await response.json();
        if (!response.ok) {
          toast.error(payload.error || "تعذر تنفيذ الإجراء المطلوب.");
          return;
        }

        toast.success(payload.message || actionConfig.successMessage);
        setActionDialog(null);
        await getData();
      } catch (requestError) {
        console.error("Payroll action failed:", requestError);
        toast.error("حدث خطأ غير متوقع أثناء تنفيذ الإجراء.");
      }
    });
  };

  const actionDialogTitle =
    actionDialog?.type === "bonus"
      ? "صرف المكافآت المعلقة"
      : actionDialog?.type === "received"
        ? "تصفية المبالغ المستلمة"
        : "حذف الموظف";

  const actionDialogDescription =
    actionDialog?.type === "bonus"
      ? `سيتم تصفير مكافآت الموظف ${actionDialog?.employee?.name || ""} وإثباتها مالياً.`
      : actionDialog?.type === "received"
        ? `سيتم تصفير رصيد المبالغ المستلمة للموظف ${actionDialog?.employee?.name || ""}.`
        : `سيتم حذف الموظف ${actionDialog?.employee?.name || ""} من القائمة النشطة. لا يمكن الحذف إذا كانت هناك سلف أو مكافآت أو مبالغ مستلمة غير مصفاة.`;

  const actionDialogLabel =
    actionDialog?.type === "bonus"
      ? "صرف المكافآت"
      : actionDialog?.type === "received"
        ? "تصفية المبالغ"
        : "حذف الموظف";

  return (
    <AppShell
      A="إدارة الموظفين والرواتب"
      sx={{ direction: "rtl", textAlign: "right" }}
      primaryTypographyProps={{ fontFamily: "Alexandria, sans-serif" }}
    >
      {paymentEmployee ? (
        <PaymentDialog
          isOpen={Boolean(paymentEmployee)}
          onClose={() => setPaymentEmployee(null)}
          onSuccess={getData}
          employeeId={paymentEmployee.id}
          employeeName={paymentEmployee.name}
        />
      ) : null}

      {advanceEmployee ? (
        <SalaryAdvanceDialog
          open={Boolean(advanceEmployee)}
          employee={advanceEmployee}
          onClose={() => setAdvanceEmployee(null)}
          onSuccess={getData}
        />
      ) : null}

      {isEmployeeDialogOpen ? (
        <EmployeeCreateDialog
          open={isEmployeeDialogOpen}
          employee={editingEmployee}
          onClose={handleCloseEmployeeDialog}
          onSuccess={getData}
        />
      ) : null}

      {actionDialog ? (
        <PayrollConfirmDialog
          open={Boolean(actionDialog)}
          title={actionDialogTitle}
          description={actionDialogDescription}
          actionLabel={actionDialogLabel}
          onClose={() => setActionDialog(null)}
          onConfirm={handlePayrollAction}
          isSubmitting={isActionSubmitting}
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
                  لوحة الموظفين والرواتب
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
                  الصفحة أصبحت مخصصة لإدارة دورة الموظف كاملة: إضافة الموظف، تعديل راتبه
                  ووظيفته، تسجيل سلفة قبل نهاية الشهر، صرف الراتب مع خصم السلفة تلقائياً،
                  وتصفية المكافآت أو المبالغ المستلمة قبل حذف الموظف.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} flexWrap="wrap">
                <Button variant="contained" onClick={handleOpenCreateDialog} sx={primaryActionSx}>
                  إضافة موظف جديد
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={getData}
                  sx={secondaryActionSx}
                  disabled={loading}
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
              title="عدد الموظفين"
              value={totalEmployees.toLocaleString("en-US")}
              helper="الموظفون النشطون فقط"
              icon={<BadgeOutlinedIcon />}
              color="#386e6e"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="إجمالي الرواتب الشهرية"
              value={formatCurrency(totalSalaries)}
              helper="مجموع الرواتب الأساسية"
              icon={<PaidOutlinedIcon />}
              color="#2e7d32"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="إجمالي السلف الحالية"
              value={formatCurrency(totalAdvances)}
              helper="السلف التي ستخصم من الرواتب القادمة"
              icon={<WalletOutlinedIcon />}
              color="#ef6c00"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <SummaryCard
              title="صافي الرواتب القادمة"
              value={formatCurrency(totalNetSalaries)}
              helper="بعد خصم السلف الحالية"
              icon={<SavingsOutlinedIcon />}
              color="#7b1fa2"
            />
          </Grid>
        </Grid>

        <Card sx={summaryCardSx}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
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
                  البحث والعمليات السريعة
                </Typography>
                <Typography
                  sx={{
                    mt: 0.75,
                    fontFamily: "Alexandria, sans-serif",
                    fontSize: "13px",
                    color: "text.secondary",
                  }}
                >
                  ابحث باسم الموظف أو مسماه الوظيفي، ثم نفّذ الإجراء المناسب من عمود
                  الإجراءات داخل الجدول.
                </Typography>
              </Box>

              <TextField
                label="بحث باسم الموظف أو الوظيفة"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                sx={{
                  minWidth: { xs: "100%", md: 340 },
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
          </CardContent>
        </Card>

        {error ? (
          <Alert severity="error" sx={{ mt: 3, fontFamily: "Alexandria, sans-serif" }}>
            {error}
          </Alert>
        ) : null}

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
                    جارٍ تحميل بيانات الموظفين...
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <EmployeesTable
              data={filteredData}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
              onOpenPayment={setPaymentEmployee}
              onOpenAdvance={setAdvanceEmployee}
              onOpenEdit={handleOpenEditDialog}
              onOpenActionDialog={setActionDialog}
            />
          )}
        </Box>
      </Box>
    </AppShell>
  );
}
