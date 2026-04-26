"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Stack,
} from "@mui/material";

import useSubmissionState from "@/app/components/useSubmissionState";

const fieldSx = {
  "& input": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "14px",
    direction: "rtl",
  },
  "& label": {
    fontFamily: "Alexandria, sans-serif",
    fontSize: "13px",
    direction: "rtl",
  },
};

const actionSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

const titleSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "15px",
  direction: "rtl",
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function PaymentDialog({ isOpen, onClose, employeeId, employeeName, onSuccess }) {
  const [salary, setSalary] = useState(0);
  const [salaryAdvance, setSalaryAdvance] = useState(0);
  const [manualDeduction, setManualDeduction] = useState("");
  const [deductionError, setDeductionError] = useState("");
  const [lastPaymentDate, setLastPaymentDate] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    const fetchSalaryAndLastPayment = async () => {
      try {
        const salaryResponse = await axios.get(
          `/api/financials/payroll/employees/salary/${employeeId}`,
        );
        setSalary(Number(salaryResponse.data.salary ?? 0));
        setSalaryAdvance(Number(salaryResponse.data.salaryAdvance ?? 0));

        try {
          const paymentResponse = await axios.get(
            `/api/financials/payroll/employees/last-payment/${employeeId}`,
          );
          const lastPayment = paymentResponse.data.lastPaymentDate;

          if (lastPayment) {
            const lastPaymentDayjs = dayjs(lastPayment);
            setLastPaymentDate(lastPaymentDayjs.format("MMMM YYYY"));
            setNextPaymentDate(lastPaymentDayjs.add(1, "month").format("MMMM YYYY"));
            return;
          }
        } catch (_error) {
          // no previous payment is a valid case
        }

        const currentMonth = dayjs();
        setLastPaymentDate("لا يوجد راتب سابق");
        setNextPaymentDate(currentMonth.format("MMMM YYYY"));
      } catch (error) {
        console.error("Failed to fetch payroll data:", error);
        toast.error("تعذر جلب بيانات الراتب.");
      }
    };

    if (employeeId) {
      fetchSalaryAndLastPayment();
    }
  }, [employeeId]);

  const handleManualDeductionChange = (event) => {
    const rawValue = event.target.value.replace(/,/g, "");
    if (!rawValue) {
      setManualDeduction("");
      setDeductionError("");
      return;
    }

    if (Number.isNaN(Number(rawValue))) {
      return;
    }

    const numericValue = Number(rawValue);
    const totalDeductions = numericValue + salaryAdvance;

    if (totalDeductions > salary) {
      setDeductionError("إجمالي الخصومات يتجاوز الراتب الشهري.");
    } else {
      setDeductionError("");
    }

    setManualDeduction(rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  const numericManualDeduction = Number(String(manualDeduction || "0").replace(/,/g, ""));
  const totalDeductions = salaryAdvance + numericManualDeduction;
  const netSalary = Math.max(salary - totalDeductions, 0);

  const canSubmit = useMemo(
    () => !deductionError && totalDeductions <= salary,
    [deductionError, salary, totalDeductions],
  );

  const handleAddPayment = async () => {
    if (!canSubmit) {
      return;
    }

    await runWithSubmission(async () => {
      const response = await axios.post("/api/financials/payroll/payments/add", {
        employeeId,
        deduction: numericManualDeduction,
      });

      onClose();
      await onSuccess?.();
      toast.success(
        `تم دفع راتب ${employeeName || "الموظف"} بمبلغ ${formatMoney(
          response.data?.finalSalary ?? netSalary,
        )}.`,
      );
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={titleSx}>دفع راتب الموظف</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            label="اسم الموظف"
            value={employeeName || ""}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="الراتب الشهري"
            value={formatMoney(salary)}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="السلفة المعلقة"
            value={formatMoney(salaryAdvance)}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="خصم إضافي"
            value={manualDeduction}
            onChange={handleManualDeductionChange}
            fullWidth
            helperText={deductionError || "اكتب أي خصم إضافي غير السلفة إن وجد."}
            error={Boolean(deductionError)}
            variant="filled"
            inputProps={{ inputMode: "numeric" }}
            sx={fieldSx}
          />
          <TextField
            label="آخر راتب مصروف"
            value={lastPaymentDate}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="موعد الراتب الحالي"
            value={nextPaymentDate}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="إجمالي الخصومات"
            value={formatMoney(totalDeductions)}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="صافي الراتب المستحق"
            value={formatMoney(netSalary)}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          {salaryAdvance > 0 ? (
            <Alert severity="info" sx={{ fontFamily: "Alexandria, sans-serif" }}>
              سيتم تصفير السلفة الحالية تلقائياً عند صرف هذا الراتب.
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button sx={actionSx} onClick={onClose} color="secondary" disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button
          sx={actionSx}
          onClick={handleAddPayment}
          color="primary"
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? "جارٍ الحفظ..." : "صرف الراتب"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
