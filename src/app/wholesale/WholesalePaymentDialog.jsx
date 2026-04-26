"use client";

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
import useSubmissionState from "@/app/components/useSubmissionState";

const actionSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

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

function WholesalePaymentDialog({
  open,
  value,
  paymentDate,
  onChange,
  onDateChange,
  onClose,
  onSubmit,
}) {
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
      await onSubmit();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ ...actionSx, fontSize: "15px" }}>تسديد مبلغ مستلم</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert
            severity="info"
            sx={{
              borderRadius: 2.5,
              "& .MuiAlert-message": {
                fontFamily: "Alexandria, sans-serif",
                fontSize: "13px",
                lineHeight: 1.8,
              },
            }}
          >
            يمكنك تحديد تاريخ التسديد الفعلي ليظهر بدقة في كشف حساب الزبون والتقارير.
          </Alert>

          <TextField
            label="المبلغ المستلم"
            type="text"
            value={value ? Number(value).toLocaleString() : ""}
            onChange={(event) => onChange(event.target.value)}
            fullWidth
            inputProps={{ inputMode: "numeric" }}
            sx={fieldSx}
          />

          <TextField
            label="تاريخ التسديد"
            type="date"
            value={paymentDate || ""}
            onChange={(event) => onDateChange(event.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button sx={actionSx} color="secondary" onClick={onClose}>
          الغاء
        </Button>
        <Button sx={actionSx} color="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "تسديد"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WholesalePaymentDialog;
