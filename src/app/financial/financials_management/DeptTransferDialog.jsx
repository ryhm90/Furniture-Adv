"use client";

import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  TextField,
} from "@mui/material";

const fieldSx = {
  "& input": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    direction: "rtl",
  },
  "& label": {
    fontFamily: "Alexandria, sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    direction: "rtl",
  },
};

export default function DeptTransferDialog({
  open,
  deptname,
  returnDetails,
  sourceName,
  onClose,
  onSourceChange,
  onAmountChange,
  onDetailsChange,
  onSubmit,
  isSubmitting = false,
}) {
  const transferOptions = [{ name: "الى الصندوق" }, { name: "طلب سابق" }, ...deptname];

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
        تحويل أو سحب من المحفظة
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FormControl fullWidth margin="normal">
          <TextField
            label="المحفظة"
            variant="filled"
            value={returnDetails.name}
            margin="dense"
            fullWidth
            disabled
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </FormControl>

        <Autocomplete
          options={transferOptions}
          freeSolo
          getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
          value={sourceName ? { name: sourceName } : null}
          onChange={(_event, newValue) => {
            if (typeof newValue === "string") {
              onSourceChange(newValue);
            } else if (newValue?.name) {
              onSourceChange(newValue.name);
            } else {
              onSourceChange("");
            }
          }}
          onInputChange={(_event, newInputValue) => {
            onSourceChange(newInputValue);
          }}
          ListboxProps={{
            sx: {
              direction: "rtl",
              fontFamily: "Alexandria, sans-serif",
              fontSize: "14px",
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="مصدر أو جهة الحركة"
              fullWidth
              variant="filled"
              margin="dense"
              sx={fieldSx}
            />
          )}
        />

        <FormControl fullWidth margin="normal">
          <TextField
            label="المبلغ"
            margin="dense"
            value={returnDetails.amount}
            onChange={(event) => onAmountChange(event.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="filled"
            sx={fieldSx}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="التفاصيل"
            variant="filled"
            value={returnDetails.details}
            onChange={(event) => onDetailsChange(event.target.value)}
            margin="dense"
            fullWidth
            InputLabelProps={{ shrink: true }}
            sx={fieldSx}
          />
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, direction: "rtl" }}>
        <Button
          onClick={onClose}
          color="secondary"
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}
        >
          إلغاء
        </Button>
        <Button
          onClick={onSubmit}
          color="primary"
          disabled={isSubmitting}
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}
        >
          {isSubmitting ? "جاري الحفظ..." : "تنفيذ الحركة"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
