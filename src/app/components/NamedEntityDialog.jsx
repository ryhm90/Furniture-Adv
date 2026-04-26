"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import axios from "axios";
import { toast } from "react-toastify";
import useSubmissionState from "@/app/components/useSubmissionState";

const fieldSx = {
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

const titleSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "15px",
  direction: "rtl",
};

const actionSx = {
  fontFamily: "Alexandria, sans-serif",
  fontWeight: 400,
  fontSize: "13px",
  direction: "rtl",
};

export default function NamedEntityDialog({
  open,
  title,
  label,
  endpoint,
  requiredMessage,
  successMessage,
  errorMessage,
  onClose,
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open) {
      setName("");
    }
  }, [open]);

  const handleClose = () => {
    setName("");
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error(requiredMessage);
      return;
    }

    await runWithSubmission(async () => {
      try {
        const response = await axios.post(endpoint, { Name: trimmedName });

        if (response.status === 200) {
          toast.success(successMessage);
          await onSuccess?.();
          handleClose();
        }
      } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle sx={titleSx}>{title}</DialogTitle>
      <DialogContent>
        <TextField
          name="Name"
          label={label}
          fullWidth
          margin="dense"
          value={name}
          onChange={(event) => setName(event.target.value)}
          variant="filled"
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions>
        <Button sx={actionSx} onClick={handleClose} color="secondary">
          الغاء
        </Button>
        <Button sx={actionSx} onClick={handleSubmit} color="primary" disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "ادخال"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
