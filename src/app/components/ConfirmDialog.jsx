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
  borderRadius: "4px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "14px",
  direction: "rtl",
};

const titleSx = {
  borderRadius: "4px",
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "16px",
  direction: "rtl",
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={titleSx}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={textSx}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button sx={textSx} onClick={onClose} color="primary">
          {cancelLabel}
        </Button>
        <Button sx={textSx} onClick={onConfirm} color="secondary" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
