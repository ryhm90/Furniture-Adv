"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
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
};

const actionSx = {
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

const createInitialValues = () => ({
  employeeName: "",
  role: "",
  hireDate: null,
  salary: "",
});

function formatMoneyValue(value) {
  if (!value && value !== 0) {
    return "";
  }

  return String(value).replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function EmployeeCreateDialog({ open, onClose, onSuccess, employee = null }) {
  const [formValues, setFormValues] = useState(createInitialValues);
  const [isSubmitting, runWithSubmission] = useSubmissionState();

  const isEditMode = Boolean(employee);

  useEffect(() => {
    if (!open) {
      setFormValues(createInitialValues());
      return;
    }

    if (employee) {
      setFormValues({
        employeeName: employee.name ?? "",
        role: employee.role ?? "",
        hireDate: employee.hire_date ? dayjs(employee.hire_date) : null,
        salary: formatMoneyValue(employee.salary ?? ""),
      });
      return;
    }

    setFormValues(createInitialValues());
  }, [employee, open]);

  const dialogTitle = useMemo(
    () => (isEditMode ? "تعديل بيانات الموظف" : "إضافة موظف جديد"),
    [isEditMode],
  );

  const submitLabel = useMemo(
    () => (isSubmitting ? "جارٍ الحفظ..." : isEditMode ? "حفظ التعديلات" : "إضافة الموظف"),
    [isEditMode, isSubmitting],
  );

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]:
        name === "salary"
          ? value.replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          : value,
    }));
  };

  const handleClose = () => {
    setFormValues(createInitialValues());
    onClose();
  };

  const handleSubmit = async () => {
    if (
      !formValues.employeeName ||
      !formValues.role ||
      !formValues.salary ||
      !formValues.hireDate
    ) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    await runWithSubmission(async () => {
      try {
        const payload = {
          employeeName: formValues.employeeName.trim(),
          role: formValues.role.trim(),
          hireDate: formValues.hireDate.format("YYYY-MM-DD"),
          salary: formValues.salary.replace(/,/g, "") || "0",
        };

        const response = await fetch(
          isEditMode
            ? `/api/financials/payroll/employees/${employee.id}`
            : "/api/financials/payroll/employees/add",
          {
            method: isEditMode ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        const responsePayload = await response.json();

        if (!response.ok) {
          toast.error(
            responsePayload.error ||
              (isEditMode ? "فشل في تعديل بيانات الموظف." : "فشل في إضافة الموظف."),
          );
          return;
        }

        toast.success(
          responsePayload.message ||
            (isEditMode ? "تم تحديث بيانات الموظف بنجاح." : "تمت إضافة الموظف بنجاح."),
        );
        await onSuccess?.();
        handleClose();
      } catch (error) {
        console.error("Error submitting employee:", error);
        toast.error("حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
      }
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={titleSx}>{dialogTitle}</DialogTitle>
      <DialogContent>
        <TextField
          label="اسم الموظف"
          name="employeeName"
          value={formValues.employeeName}
          onChange={handleFieldChange}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        />
        <TextField
          label="المسمى الوظيفي"
          name="role"
          value={formValues.role}
          onChange={handleFieldChange}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
          <DatePicker
            label="تاريخ التعيين"
            value={formValues.hireDate}
            onChange={(newValue) =>
              setFormValues((current) => ({ ...current, hireDate: newValue }))
            }
            format="YYYY-MM-DD"
            slotProps={{
              textField: {
                fullWidth: true,
                margin: "normal",
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
                    fontSize: "13px",
                  },
                },
              },
            }}
          />
        </LocalizationProvider>
        <TextField
          label="الراتب الشهري"
          name="salary"
          value={formValues.salary}
          onChange={handleFieldChange}
          fullWidth
          margin="normal"
          variant="filled"
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions>
        <Button sx={actionSx} onClick={handleClose} color="secondary" disabled={isSubmitting}>
          إلغاء
        </Button>
        <Button sx={actionSx} onClick={handleSubmit} color="primary" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
