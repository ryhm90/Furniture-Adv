"use client";

import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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

export default function DeptCreateDialog({
  open,
  deptname,
  formValues,
  mode = "create",
  returnToSafebox,
  onClose,
  onNameChange,
  onAmountChange,
  onDetailsChange,
  onToggleReturnToSafebox,
  onSubmit,
  isSubmitting = false,
}) {
  const isEnhanceMode = mode === "enhance";

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
        {isEnhanceMode ? "تعزيز رصيد المحفظة" : "إضافة محفظة أو تعزيز رصيد"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FormControl fullWidth margin="normal">
          {isEnhanceMode ? (
            <TextField
              label="اسم المحفظة"
              fullWidth
              variant="filled"
              value={formValues.name}
              disabled
              sx={fieldSx}
            />
          ) : (
            <Autocomplete
              options={deptname}
              freeSolo
              getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
              value={formValues.name ? { name: formValues.name } : null}
              onChange={(_event, newValue) => {
                if (typeof newValue === "string") {
                  onNameChange(newValue);
                } else if (newValue?.name) {
                  onNameChange(newValue.name);
                } else {
                  onNameChange("");
                }
              }}
              onInputChange={(_event, newInputValue) => {
                onNameChange(newInputValue);
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
                  label="اسم المحفظة"
                  fullWidth
                  variant="filled"
                  sx={fieldSx}
                />
              )}
            />
          )}

          <TextField
            label="المبلغ"
            variant="filled"
            fullWidth
            margin="dense"
            value={formValues.amount}
            onChange={(event) => onAmountChange(event.target.value)}
            sx={fieldSx}
          />

          {isEnhanceMode ? (
            <TextField
              label="التفاصيل"
              variant="filled"
              fullWidth
              margin="dense"
              value={formValues.details || ""}
              onChange={(event) => onDetailsChange(event.target.value)}
              multiline
              minRows={3}
              sx={fieldSx}
            />
          ) : null}

          <FormControlLabel
            control={
              <Checkbox
                checked={returnToSafebox}
                onChange={(event) => onToggleReturnToSafebox(event.target.checked)}
              />
            }
            label="عدم تسجيل الحركة في الصندوق الكلي"
            sx={{
              mt: 1,
              direction: "rtl",
              "& .MuiFormControlLabel-label": {
                fontFamily: "Alexandria, sans-serif",
                fontSize: "12px",
                fontWeight: 400,
              },
            }}
          />
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, direction: "rtl" }}>
        <Button
          color="secondary"
          onClick={onClose}
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}
        >
          إغلاق
        </Button>
        <Button
          color="primary"
          onClick={onSubmit}
          disabled={isSubmitting}
          sx={{ fontFamily: "Alexandria, sans-serif", fontSize: "13px" }}
        >
          {isSubmitting ? "جاري الحفظ..." : isEnhanceMode ? "تعزيز الرصيد" : "حفظ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
