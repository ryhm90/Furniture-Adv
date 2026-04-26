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
  Typography,
} from "@mui/material";
import axios from "axios";
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

function getCurrentMonth() {
  return new Date().toLocaleDateString("en-CA").slice(0, 7);
}

function normalizeNumericInput(value) {
  return value.replace(/[^0-9]/g, "");
}

function formatNumberWithCommas(value) {
  if (!value) {
    return "";
  }

  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IQD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function RentFormDialog({ open, onClose }) {
  const [galleryRent, setGalleryRent] = useState("");
  const [warehouseRent, setWarehouseRent] = useState("");
  const [rentDate, setRentDate] = useState(getCurrentMonth());
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open) {
      setGalleryRent("");
      setWarehouseRent("");
      setRentDate(getCurrentMonth());
    }
  }, [open]);

  const numericGalleryRent = Number(galleryRent.replace(/,/g, "") || 0);
  const numericWarehouseRent = Number(warehouseRent.replace(/,/g, "") || 0);
  const totalRent = numericGalleryRent + numericWarehouseRent;

  const isSaveDisabled = useMemo(
    () => !rentDate || totalRent <= 0,
    [rentDate, totalRent],
  );

  const handleRentChange = (setter) => (event) => {
    const normalizedValue = normalizeNumericInput(event.target.value);
    setter(normalizedValue ? formatNumberWithCommas(normalizedValue) : "");
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
      try {
        const response = await axios.post("/api/safeboxiq/saveRent", {
          galleryRent: galleryRent.replace(/,/g, ""),
          warehouseRent: warehouseRent.replace(/,/g, ""),
          rentDate,
        });

        toast.success(response.data?.message || "تم حفظ دفعة الإيجار بنجاح.");
        onClose();
      } catch (error) {
        console.error("Error saving rent record:", error);
        toast.error(
          error?.response?.data?.message || "تعذر حفظ دفعة الإيجار. يرجى المحاولة مرة أخرى.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          fontFamily: "Alexandria, sans-serif",
          fontWeight: 500,
          fontSize: "16px",
          direction: "rtl",
        }}
      >
        تسجيل دفعة إيجار جديدة
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
            يمكنك تسجيل إيجار المعرض أو المخزن أو الاثنين معاً لنفس الشهر، وسيتم تثبيت
            الحركة مالياً داخل الصندوق مباشرة.
          </Typography>

          <TextField
            label="شهر الإيجار"
            type="month"
            value={rentDate}
            onChange={(event) => setRentDate(event.target.value)}
            fullWidth
            variant="filled"
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />

          <TextField
            label="إيجار المعرض"
            value={galleryRent}
            onChange={handleRentChange(setGalleryRent)}
            fullWidth
            variant="filled"
            inputProps={{ inputMode: "numeric" }}
            helperText="اختياري"
            sx={fieldSx}
          />

          <TextField
            label="إيجار المخزن"
            value={warehouseRent}
            onChange={handleRentChange(setWarehouseRent)}
            fullWidth
            variant="filled"
            inputProps={{ inputMode: "numeric" }}
            helperText="اختياري"
            sx={fieldSx}
          />

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
            إجمالي دفعة الإيجار الحالية: {formatCurrency(totalRent)}
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={handleClose}
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
          disabled={isSaveDisabled || isSubmitting}
          sx={{
            fontFamily: "Alexandria, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
          }}
        >
          {isSubmitting ? "جارٍ الحفظ..." : "حفظ دفعة الإيجار"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
