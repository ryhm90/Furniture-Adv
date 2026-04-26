"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import useSubmissionState from "@/app/components/useSubmissionState";

const fieldSx = {
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

const actionSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

function getTodayDate() {
  return new Date().toLocaleDateString("en-CA");
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function SalaryAdvanceDialog({ open, employee, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [advanceDate, setAdvanceDate] = useState(getTodayDate());
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNotes("");
      setAdvanceDate(getTodayDate());
    }
  }, [open]);

  const numericAmount = Number(String(amount || "0").replace(/,/g, ""));
  const currentAdvance = Number(employee?.salary_advance ?? 0);
  const salary = Number(employee?.salary ?? 0);
  const nextAdvanceBalance = currentAdvance + numericAmount;
  const remainingSalary = salary - nextAdvanceBalance;
  const hasValidationError = numericAmount <= 0 || nextAdvanceBalance > salary;

  const helperText = useMemo(() => {
    if (!amount) {
      return "سيتم خصم هذه السلفة تلقائياً من الراتب القادم.";
    }

    if (numericAmount <= 0) {
      return "يجب أن يكون مبلغ السلفة أكبر من صفر.";
    }

    if (nextAdvanceBalance > salary) {
      return "إجمالي السلف لا يمكن أن يتجاوز الراتب الشهري.";
    }

    return `الرصيد الجديد للسلف: ${formatMoney(nextAdvanceBalance)}`;
  }, [amount, nextAdvanceBalance, numericAmount, salary]);

  const handleSubmit = async () => {
    if (!employee || hasValidationError) {
      return;
    }

    await runWithSubmission(async () => {
      try {
        const response = await fetch("/api/financials/payroll/employees/advance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId: employee.id,
            amount: numericAmount,
            notes,
            advanceDate,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          toast.error(payload.error || "فشل في تسجيل سلفة الراتب.");
          return;
        }

        toast.success(payload.message || "تم تسجيل سلفة الراتب بنجاح.");
        await onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Failed to add salary advance:", error);
        toast.error("حدث خطأ غير متوقع أثناء تسجيل السلفة.");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={actionSx}>سحب سلفة من الراتب</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField
            label="اسم الموظف"
            value={employee?.name || ""}
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
            label="السلف الحالية"
            value={formatMoney(currentAdvance)}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="مبلغ السلفة"
            value={amount}
            onChange={(event) => {
              const rawValue = event.target.value.replace(/,/g, "");
              if (!rawValue) {
                setAmount("");
                return;
              }

              if (!Number.isNaN(Number(rawValue))) {
                setAmount(rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
              }
            }}
            fullWidth
            variant="filled"
            error={Boolean(amount) && hasValidationError}
            helperText={helperText}
            inputProps={{ inputMode: "numeric" }}
            sx={fieldSx}
          />
          <TextField
            label="تاريخ السلفة"
            type="date"
            value={advanceDate}
            onChange={(event) => setAdvanceDate(event.target.value)}
            fullWidth
            variant="filled"
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
          <TextField
            label="ملاحظات"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            fullWidth
            multiline
            minRows={2}
            variant="filled"
            sx={fieldSx}
          />
          <TextField
            label="المتبقي من الراتب بعد السلفة"
            value={formatMoney(Math.max(remainingSalary, 0))}
            fullWidth
            disabled
            variant="filled"
            sx={fieldSx}
          />
          <Alert severity="info" sx={{ fontFamily: "Alexandria, sans-serif" }}>
            هذه السلفة ستُسجل مباشرة كمصروف وتُخصم تلقائياً عند صرف الراتب القادم.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button sx={actionSx} onClick={onClose} color="secondary" disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button
          sx={actionSx}
          onClick={handleSubmit}
          color="primary"
          disabled={isSubmitting || hasValidationError || !employee}
        >
          {isSubmitting ? "جارٍ الحفظ..." : "تسجيل السلفة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
