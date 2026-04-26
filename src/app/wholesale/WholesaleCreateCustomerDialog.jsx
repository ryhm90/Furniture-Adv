"use client";

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import useSubmissionState from "@/app/components/useSubmissionState";

const textFieldSx = {
  borderRadius: "4px",
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
  "& input::placeholder": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
  },
};

const actionButtonSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

function WholesaleCreateCustomerDialog({ open, value, onChange, onClose, onSave }) {
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const handleSave = async () => {
    await runWithSubmission(async () => {
      await onSave();
    });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={actionButtonSx}>اضافة زبون جديد</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="اسم الزبون"
          value={value.Clname}
          onChange={(event) => onChange({ ...value, Clname: event.target.value })}
          margin="normal"
          variant="filled"
          sx={textFieldSx}
        />
        <TextField
          fullWidth
          label="اسم الصفحة"
          value={value.affiliate}
          onChange={(event) => onChange({ ...value, affiliate: event.target.value })}
          margin="normal"
          variant="filled"
          sx={textFieldSx}
        />
        <TextField
          fullWidth
          label="الفئة"
          select
          value={value.TiD}
          onChange={(event) => onChange({ ...value, TiD: event.target.value })}
          margin="normal"
          variant="filled"
          sx={{
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
          }}
        >
          <MenuItem sx={actionButtonSx} value="Tier1">
            الفئة الاولى
          </MenuItem>
          <MenuItem sx={actionButtonSx} value="Tier2">
            الفئة الثانية
          </MenuItem>
          <MenuItem sx={actionButtonSx} value="Tier3">
            الفئة الثالثة
          </MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button sx={actionButtonSx} onClick={onClose} color="secondary">
          الغاء
        </Button>
        <Button
          sx={actionButtonSx}
          onClick={handleSave}
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WholesaleCreateCustomerDialog;
