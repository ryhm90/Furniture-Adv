"use client";

import { useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
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

const initialFormValues = {
  providerName: "",
  providerId: "",
  itemName: "",
  factoryName: "",
  agreedCount: "",
  factoryPrice: "",
  date: null,
};

export default function ProvidersInvoiceDialog({
  open,
  providers,
  onClose,
  onSuccess,
}) {
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  useEffect(() => {
    if (!open) {
      setFormValues(initialFormValues);
    }
  }, [open]);

  const handleClose = () => {
    setFormValues(initialFormValues);
    onClose();
  };

  const handleSubmit = async () => {
    await runWithSubmission(async () => {
      try {
        const response = await axios.post("/api/financials/providers/addInvoice", {
          providerName: formValues.providerName,
          providerId: formValues.providerId,
          itemName: formValues.itemName,
          factoryName: formValues.factoryName,
          agreedCount: formValues.agreedCount,
          factoryPrice: formValues.factoryPrice,
          date: formValues.date ? formValues.date.toDate().toLocaleDateString() : null,
        });

        if (response.status === 200) {
          toast.success("تمت إضافة الطلبية بنجاح.");
          await onSuccess?.();
          handleClose();
        }
      } catch (error) {
        console.error("Error adding invoice:", error);
        toast.error("تعذر إضافة الطلبية.");
      }
    });
  };

  const selectedProvider =
    providers.find((provider) => provider.id === formValues.providerId) ?? null;

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle sx={titleSx}>إضافة طلبية جديدة</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={providers}
          getOptionLabel={(option) => option.name}
          value={selectedProvider}
          onChange={(_event, newValue) =>
            setFormValues((current) => ({
              ...current,
              providerName: newValue?.name ?? "",
              providerId: newValue?.id ?? "",
            }))
          }
          renderInput={(params) => (
            <TextField {...params} label="اسم المورد" variant="filled" sx={fieldSx} />
          )}
        />

        <TextField
          label="اسم المادة"
          variant="filled"
          sx={fieldSx}
          fullWidth
          margin="dense"
          value={formValues.itemName}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, itemName: event.target.value }))
          }
        />

        <TextField
          label="اسم المصنع"
          variant="filled"
          sx={fieldSx}
          fullWidth
          margin="dense"
          value={formValues.factoryName}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, factoryName: event.target.value }))
          }
        />

        <TextField
          label="العدد المتفق عليه"
          type="number"
          variant="filled"
          sx={fieldSx}
          fullWidth
          margin="dense"
          value={formValues.agreedCount}
          onChange={(event) =>
            setFormValues((current) => ({ ...current, agreedCount: event.target.value }))
          }
        />

        <TextField
          label="سعر القطعة من المصنع"
          variant="filled"
          sx={fieldSx}
          fullWidth
          margin="dense"
          value={formValues.factoryPrice}
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              factoryPrice: event.target.value
                .replace(/,/g, "")
                .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
            }))
          }
        />

        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
          <DatePicker
            label="التاريخ"
            value={formValues.date}
            onChange={(newValue) =>
              setFormValues((current) => ({ ...current, date: newValue }))
            }
            format="YYYY-MM-DD"
            slotProps={{
              textField: {
                variant: "filled",
                InputProps: {
                  sx: {
                    fontFamily: "Alexandria, sans-serif",
                    fontWeight: 400,
                    fontSize: "14px",
                  },
                },
                InputLabelProps: {
                  sx: {
                    fontFamily: "Alexandria, sans-serif",
                    fontWeight: 400,
                    fontSize: "12px",
                  },
                },
              },
            }}
            className="mb-2"
          />
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button color="secondary" sx={actionSx} onClick={handleClose}>
          إغلاق
        </Button>
        <Button sx={actionSx} onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "جاري الحفظ..." : "إدخال"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
