"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const textSx = {
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

export default function PayrollConfirmDialog({
  open,
  title,
  description,
  actionLabel,
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={titleSx}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={textSx}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button sx={textSx} onClick={onClose} color="secondary" disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button sx={textSx} onClick={onConfirm} color="primary" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ التنفيذ..." : actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
