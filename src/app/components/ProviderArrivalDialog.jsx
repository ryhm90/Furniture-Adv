"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  borderRadius: "4px",
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

const initialValues = {
  receivedCount: "",
  notes: "",
};

export default function ProviderArrivalDialog({
  open,
  selectedId,
  onClose,
  onSuccess,
}) {
  const [arrivalDetails, setArrivalDetails] = useState(initialValues);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open) {
      setArrivalDetails(initialValues);
    }
  }, [open]);

  const handleClose = () => {
    setArrivalDetails(initialValues);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedId) {
      return;
    }

    await runWithSubmission(async () => {
      try {
        await axios.post("/api/financials/providers/confirmArrival", {
          id: selectedId,
          ...arrivalDetails,
        });

        toast.success("Invoice Status successfully Updated!");
        await onSuccess?.();
        handleClose();
      } catch (error) {
        console.error("Error confirming arrival:", error);
        toast.error("Invoice Status unsuccessfully Updated");
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle sx={titleSx}>تأكيد وصول البضاعة</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal" sx={{ width: "50%" }}>
          <TextField
            label="العدد المستلم"
            variant="filled"
            sx={fieldSx}
            value={arrivalDetails.receivedCount}
            onChange={(event) =>
              setArrivalDetails((current) => ({
                ...current,
                receivedCount: event.target.value,
              }))
            }
            name="receivedCount"
            type="number"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="الملاحظات"
            variant="filled"
            sx={fieldSx}
            value={arrivalDetails.notes}
            onChange={(event) =>
              setArrivalDetails((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            name="notes"
            fullWidth
            multiline
            rows={6}
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" sx={actionSx} onClick={handleClose}>
          الغاء
        </Button>
        <Button onClick={handleSubmit} color="primary" sx={actionSx} disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "تأكيد الوصول!"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
