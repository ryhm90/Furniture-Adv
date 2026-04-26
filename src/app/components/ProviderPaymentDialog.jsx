"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import axios from "axios";
import dayjs from "dayjs";
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
  "& .MuiFormHelperText-root": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    direction: "rtl",
  },
};

const SAFEBOX_ACCOUNT = "من الصندوق";

function parseNumericValue(value) {
  return Number(String(value || "0").replace(/,/g, ""));
}

function formatNumberInput(value) {
  if (!value) {
    return "";
  }

  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUsdCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatIqdCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ProviderPaymentDialog({ open, provider, onClose, onSuccess }) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [changeRate, setChangeRate] = useState("");
  const [iqdPayment, setIqdPayment] = useState("");
  const [deptNames, setDeptNames] = useState([]);
  const [accountName, setAccountName] = useState(SAFEBOX_ACCOUNT);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open || !provider) {
      return;
    }

    let ignore = false;

    const fetchDebtNames = async () => {
      try {
        const response = await axios.get("/api/financials/dept/getdebtNames");
        if (!ignore) {
          setDeptNames(response.data.map((deptName) => ({ name: deptName.name })));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error fetching dept names:", error);
        }
      }
    };

    fetchDebtNames();

    return () => {
      ignore = true;
    };
  }, [open, provider]);

  useEffect(() => {
    if (!open) {
      setPaymentAmount("");
      setIqdPayment("");
      setChangeRate("");
      setAccountName(SAFEBOX_ACCOUNT);
      setPaymentDate(dayjs());
    }
  }, [open]);

  const numericUsdPayment = parseNumericValue(paymentAmount);
  const numericIqdPayment = parseNumericValue(iqdPayment);
  const numericBalance = Number(provider?.Balance ?? 0);
  const hasPayableBalance = numericBalance > 0;
  const exceedsBalance = numericUsdPayment > numericBalance && hasPayableBalance;

  const inferredChangeRate = useMemo(() => {
    if (numericUsdPayment > 0 && numericIqdPayment > 0) {
      return (numericIqdPayment / numericUsdPayment).toFixed(2);
    }

    return "";
  }, [numericIqdPayment, numericUsdPayment]);

  useEffect(() => {
    setChangeRate(inferredChangeRate);
  }, [inferredChangeRate]);

  if (!provider) {
    return null;
  }

  const isSubmitDisabled =
    !hasPayableBalance ||
    !accountName ||
    !paymentDate ||
    numericUsdPayment <= 0 ||
    numericIqdPayment <= 0 ||
    !changeRate ||
    exceedsBalance;

  const handlePaymentAmountChange = (event) => {
    const rawAmount = event.target.value.replace(/[^0-9.]/g, "");
    setPaymentAmount(rawAmount ? formatNumberInput(rawAmount) : "");
  };

  const handleIqdPaymentAmountChange = (event) => {
    const rawIqdPayment = event.target.value.replace(/[^0-9.]/g, "");
    setIqdPayment(rawIqdPayment ? formatNumberInput(rawIqdPayment) : "");
  };

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
      try {
        await axios.post("/api/financials/providers/paymentf", {
          providerId: provider.Name_ID,
          amount: paymentAmount,
          name: provider.Name,
          type: provider.type,
          date: paymentDate.format("YYYY-MM-DD"),
          changeRate,
          IQDPayment: iqdPayment,
          account: accountName,
        });

        toast.success("تم تسجيل دفعة المورد بنجاح.");
        await onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error processing payment:", error);
        toast.error(error?.response?.data?.error || "تعذر تسجيل الدفعة.");
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 500,
          fontSize: "16px",
          direction: "rtl",
        }}
      >
        تسديد مستحقات المورد
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography
            sx={{
              fontFamily: "Alexandria, sans-serif",
              fontSize: "13px",
              color: "text.secondary",
              lineHeight: 1.9,
            }}
          >
            يمكنك تسديد رصيد المورد بالدولار مع تسجيل القيمة المقابلة بالدينار والمحفظة
            المستخدمة في الدفع.
          </Typography>

          <Box
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(15, 23, 42, 0.08)",
              backgroundColor: "rgba(15, 23, 42, 0.02)",
              p: 2,
            }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                المورد: {provider.Name}
              </Typography>
              <Typography sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}>
                نوع الخدمة: {provider.type || "-"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: numericBalance > 0 ? "#c62828" : "#2e7d32",
                }}
              >
                الرصيد الحالي: {formatUsdCurrency(numericBalance)}
              </Typography>
            </Stack>
          </Box>

          <TextField
            label="المبلغ بالدولار"
            value={paymentAmount}
            onChange={handlePaymentAmountChange}
            fullWidth
            variant="filled"
            sx={fieldSx}
            helperText="أدخل مبلغ التسديد بالدولار."
          />

          <Autocomplete
            options={[{ name: SAFEBOX_ACCOUNT }, ...deptNames]}
            freeSolo
            ListboxProps={{
              sx: {
                direction: "rtl",
                fontFamily: "Alexandria, sans-serif",
                fontSize: "13px",
              },
            }}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
            value={accountName ? { name: accountName } : null}
            onChange={(_event, newValue) => {
              if (typeof newValue === "string") {
                setAccountName(newValue);
              } else if (newValue?.name) {
                setAccountName(newValue.name);
              } else {
                setAccountName("");
              }
            }}
            onInputChange={(_event, newInputValue) => {
              setAccountName(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="المحفظة أو مصدر الدفع"
                fullWidth
                variant="filled"
                sx={fieldSx}
              />
            )}
          />

          <TextField
            label="المبلغ بالدينار"
            value={iqdPayment}
            onChange={handleIqdPaymentAmountChange}
            fullWidth
            variant="filled"
            sx={fieldSx}
            helperText="سيُستخدم لحركة الصندوق أو المحفظة."
          />

          <TextField
            label="سعر الصرف"
            value={changeRate}
            fullWidth
            variant="filled"
            sx={fieldSx}
            disabled
            helperText="يُحتسب تلقائياً من قيمة الدينار والدولار."
          />

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <DatePicker
              label="تاريخ الدفع"
              value={paymentDate}
              onChange={(newDate) => setPaymentDate(newDate)}
              format="YYYY-MM-DD"
              slotProps={{
                textField: {
                  variant: "filled",
                  fullWidth: true,
                  sx: fieldSx,
                },
              }}
            />
          </LocalizationProvider>

          {exceedsBalance ? (
            <Alert
              severity="warning"
              sx={{
                borderRadius: 3,
                "& .MuiAlert-message": {
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                },
              }}
            >
              مبلغ التسديد أكبر من الرصيد الحالي للمورد.
            </Alert>
          ) : null}

          {!hasPayableBalance ? (
            <Alert
              severity="info"
              sx={{
                borderRadius: 3,
                "& .MuiAlert-message": {
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                },
              }}
            >
              لا يوجد رصيد مستحق على هذا المورد حالياً.
            </Alert>
          ) : null}

          {numericUsdPayment > 0 && numericIqdPayment > 0 ? (
            <Alert
              severity="info"
              sx={{
                borderRadius: 3,
                "& .MuiAlert-message": {
                  fontFamily: "Alexandria, sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.9,
                },
              }}
            >
              صافي الرصيد بعد الدفع: {formatUsdCurrency(Math.max(numericBalance - numericUsdPayment, 0))}
              <br />
              قيمة الدفع بالدينار: {formatIqdCurrency(numericIqdPayment)}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          color="secondary"
          disabled={isSubmitting}
          sx={{
            fontFamily: "Alexandria, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
          }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          disabled={isSubmitDisabled || isSubmitting}
          sx={{
            fontFamily: "Alexandria, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
          }}
        >
          {isSubmitting ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
